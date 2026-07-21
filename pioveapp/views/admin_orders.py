from ._base import *

def handle_loyalty_points(order, old_status, new_status):
    if old_status != 'fulfilled' and new_status == 'fulfilled':
        try:
            if not order.user:
                return  # Commande invité — pas de points
            # Refresh profile depuis la DB pour éviter données stale
            try:
                profile = order.user.profile
                profile.refresh_from_db()
            except Exception:
                return  # Pas de profil
            if profile.is_b2b:
                return  # Pas de points pour B2B
            points_to_add = int(order.total or 0)
            if points_to_add <= 0:
                return
            profile.loyalty_points += points_to_add
            while profile.loyalty_points >= 5000:
                profile.loyalty_points -= 5000
                import uuid
                from ..models import Coupon
                code = f"FIDELITE-{order.user.id}-{uuid.uuid4().hex[:6].upper()}"
                Coupon.objects.create(
                    code=code,
                    user=order.user,
                    discount_type='percentage',
                    discount_value=10,
                    usage_limit=1,
                    is_active=True
                )
            profile.save(update_fields=['loyalty_points'])
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Loyalty points error for order {order.id}: {e}")

class AdminOrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.filter(is_deleted=False).select_related('user', 'customer').prefetch_related('items').order_by('-created_at')
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'payment_status', 'delivery_type', 'customer__is_b2b']
    search_fields = ['guest_name', 'guest_phone', 'user__username', 'user__first_name', 'id']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'partial_update':
            return AdminOrderStatusSerializer
        return AdminOrderSerializer

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        updated_instance = serializer.save()
        if old_status != updated_instance.status:
            OrderStatusHistory.objects.create(
                order=updated_instance,
                status=updated_instance.status,
                notes=f"Statut modifié par un administrateur."
            )
            handle_loyalty_points(updated_instance, old_status, updated_instance.status)
            
            # --- EMAIL NOTIFICATION FOR CONFIRMED/CANCELLED ---
            if updated_instance.status in ['confirmed', 'cancelled']:
                recipient_email = getattr(updated_instance, 'guest_email', None)
                if not recipient_email and updated_instance.user:
                    recipient_email = updated_instance.user.email
                
                def send_status_email_task(order_id, recipient, status):
                    try:
                        from ..models import Order
                        o = Order.objects.prefetch_related('items').get(id=order_id)
                        subject = f"Mise à jour de votre commande #{o.id} - Piové Cosmetics"
                        text_content = render_to_string('emails/order_status_update.txt', {'order': o, 'status': status})
                        html_content = render_to_string('emails/order_status_update.html', {'order': o, 'status': status})
                        
                        admin_email = 'lbetaimi@piovecosmetics.com'
                        # Send to customer, BCC admin
                        if recipient:
                            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [recipient], bcc=[admin_email])
                        else:
                            # If no customer email, send directly to admin
                            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [admin_email])
                        
                        msg.attach_alternative(html_content, "text/html")
                        msg.send(fail_silently=True)
                    except Exception as e:
                        logger.warning('%s: %s', __name__, e)
                import threading
                threading.Thread(target=send_status_email_task, args=(updated_instance.id, recipient_email, updated_instance.status)).start()

            
            # --- MYLERZ AUTO-SHIP ---
            if updated_instance.status == 'confirmed' and not updated_instance.mylerz_barcode:
                from . import mylerz_service
                def async_mylerz_ship(order_id):
                    try:
                        from ..models import Order, OrderStatusHistory
                        o = Order.objects.get(id=order_id)
                        res = mylerz_service.create_shipment(o)
                        if res.get('success'):
                            o.mylerz_barcode = res.get('barcode') or ''
                            o.mylerz_pickup_code = res.get('pickup_code') or ''
                            o.mylerz_status = 'Shipment Created'
                            o.save(update_fields=['mylerz_barcode', 'mylerz_pickup_code', 'mylerz_status'])
                            OrderStatusHistory.objects.create(
                                order=o,
                                status=o.status,
                                notes=f"Colis Mylerz généré auto. Barcode: {o.mylerz_barcode}"
                            )
                        else:
                            msg = res.get('message', 'Erreur inconnue')
                            OrderStatusHistory.objects.create(
                                order=o,
                                status=o.status,
                                notes=f"Échec de création du colis Mylerz : {msg}"
                            )
                    except Exception as e:
                        logger.warning('%s: %s', __name__, e)
                import threading
                threading.Thread(target=async_mylerz_ship, args=(updated_instance.id,)).start()

        from ..models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f'Modification de la commande #{updated_instance.id} (Statut: {updated_instance.status})',
            ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
        )

    @action(detail=True, methods=['get'])
    def mylerz_ship_debug(self, request, pk=None):
        """Debug: build the Mylerz payload for a real order WITHOUT sending it."""
        order = self.get_object()
        from . import mylerz_service
        import datetime
        try:
            # Reproduce create_shipment payload building logic
            items_summary = ', '.join(
                f"{item.product_name} x{item.quantity}" for item in order.items.all()
            ) or f"Commande #{order.id}"

            customer_name, mobile_no, customer_email = '', '', ''
            if order.customer:
                customer_name = order.customer.name or ''
                mobile_no = order.customer.phone or ''
                customer_email = order.customer.email or ''
            if order.user:
                if not customer_name:
                    customer_name = order.user.get_full_name() or order.user.username or ''
                if not customer_email:
                    customer_email = order.user.email or ''
                if not mobile_no:
                    try: mobile_no = order.user.profile.phone or ''
                    except: mobile_no = ''
            customer_name = customer_name or getattr(order, 'guest_name', '') or 'Client'
            mobile_no = mobile_no or getattr(order, 'guest_phone', '') or ''
            customer_email = customer_email or getattr(order, 'guest_email', '') or ''

            payment_type = 'PP' if order.payment_method == 'cib' else 'COD'
            cod_value = 0.0 if order.payment_method == 'cib' else float(order.total)

            city = getattr(order, 'wilaya', None) or 'Alger'
            neighborhood = getattr(order, 'city', None) or city
            street = getattr(order, 'shipping_address', None) or neighborhood

            total_weight = 0.0
            for item in order.items.all():
                try:
                    w = float(getattr(item.product, 'weight_box', None) or 0)
                except: w = 0.0
                if w <= 0: w = 0.1
                total_weight += w * item.quantity
            if total_weight < 0.1: total_weight = 0.5

            warehouse = mylerz_service._cfg_warehouse()
            payload = {
                "PickupDueDate": (datetime.datetime.now() + datetime.timedelta(days=1)).isoformat(),
                "Package_Serial": str(order.id),
                "Description": items_summary[:200],
                "Total_Weight": round(total_weight, 2),
                "Service_Type": "DTD",
                "Service": "ND",
                "Service_Category": "Delivery",
                "Payment_Type": payment_type,
                "COD_Value": cod_value,
                "Pieces": [{"pieceNo": 1, "Weight": round(total_weight, 2)}],
                "Customer_Name": customer_name,
                "Customer_Email": customer_email,
                "Mobile_No": mobile_no,
                "Street": street,
                "City": city,
                "Neighborhood": neighborhood,
                "District": neighborhood,
                "Address_Category": "H",
                "Special_Notes": getattr(order, 'notes', '') or '',
                "Reference": str(order.id),
                "AllowToOpenPackage": True,
                "ValueOfGoods": float(order.total),
                "Country": "DZ",
            }
            if warehouse:
                payload["WarehouseName"] = warehouse
            return Response({
                'order_id': order.id,
                'mylerz_barcode_already_set': bool(order.mylerz_barcode),
                'mylerz_barcode': order.mylerz_barcode,
                'payload': payload,
                'warehouse': warehouse,
            })
        except Exception as e:
            import traceback
            return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=500)

    @action(detail=False, methods=['get'])
    def mylerz_test(self, request):
        """Diagnostic: test Mylerz auth + test AddOrders with minimal payload."""
        import requests as req_lib
        import datetime
        from . import mylerz_service
        result = {
            'username': mylerz_service.MYLERZ_USERNAME or '(vide)',
            'password_set': bool(mylerz_service.MYLERZ_PASSWORD),
            'warehouse': mylerz_service.MYLERZ_WAREHOUSE,
            'base_url': mylerz_service.MYLERZ_BASE_URL,
        }
        # Step 1: Auth
        token = None
        try:
            token = mylerz_service.get_mylerz_token()
            result['auth'] = 'OK'
        except Exception as e:
            result['auth'] = f'FAILED: {e}'
            return Response(result)

        # Step 2: Test AddOrders with minimal payload
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        }
        test_payload = [{
            "PickupDueDate": (datetime.datetime.now() + datetime.timedelta(days=1)).isoformat(),
            "Package_Serial": "DIAG-TEST-001",
            "Description": "Test diagnostic",
            "Total_Weight": 0.5,
            "Service_Type": "DTD",
            "Service": "ND",
            "Service_Category": "Delivery",
            "Payment_Type": "COD",
            "COD_Value": 500.0,
            "Pieces": [{"pieceNo": 1, "Weight": 0.5}],
            "Customer_Name": "Test Client",
            "Customer_Email": "test@piovecosmetics.dz",
            "Mobile_No": "0770000000",
            "Street": "Rue test Alger",
            "City": "Alger",
            "Neighborhood": "Alger Centre",
            "District": "Alger Centre",
            "Address_Category": "H",
            "Special_Notes": "",
            "Reference": "DIAG-001",
            "WarehouseName": mylerz_service.MYLERZ_WAREHOUSE,
            "AllowToOpenPackage": True,
            "ValueOfGoods": 500.0,
            "Country": "DZ",
        }]
        try:
            resp = req_lib.post(
                f"{mylerz_service.MYLERZ_BASE_URL}/api/Orders/AddOrders",
                json=test_payload,
                headers=headers,
                timeout=20,
            )
            try:
                result['addorders_status'] = resp.status_code
                result['addorders_response'] = resp.json()
            except Exception:
                result['addorders_status'] = resp.status_code
                result['addorders_response_raw'] = resp.text[:500]
        except Exception as e:
            result['addorders_error'] = str(e)
        return Response(result)

    @action(detail=True, methods=['post'])
    def mylerz_ship(self, request, pk=None):
        order = self.get_object()
        if order.mylerz_barcode:
            return Response({'error': 'Ce colis a déjà un code-barres Mylerz.'}, status=400)
        from . import mylerz_service
        try:
            res = mylerz_service.create_shipment(order)
        except Exception as e:
            import traceback
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"mylerz_ship exception for order #{order.id}: {traceback.format_exc()}")
            return Response({'success': False, 'message': f'Erreur serveur Mylerz: {e}'}, status=400)
        if res.get('success'):
            order.mylerz_barcode = res.get('barcode') or ''
            order.mylerz_pickup_code = res.get('pickup_code') or ''
            order.mylerz_status = 'Shipment Created'
            order.save(update_fields=['mylerz_barcode', 'mylerz_pickup_code', 'mylerz_status'])
            OrderStatusHistory.objects.create(
                order=order,
                status=order.status,
                notes=f"Colis Mylerz généré manuellement. Barcode: {order.mylerz_barcode}"
            )
            return Response(res)
        return Response(res, status=400)

    @action(detail=True, methods=['get'])
    def mylerz_track(self, request, pk=None):
        order = self.get_object()
        if not order.mylerz_barcode:
            return Response({'error': 'Aucun code-barres Mylerz pour cette commande.'}, status=400)
        from . import mylerz_service
        res = mylerz_service.track_shipment(order.mylerz_barcode)
        if res.get('success'):
            tracking = res.get('tracking', [])
            if tracking:
                latest = tracking[0]
                new_status = latest.get('Status') or latest.get('status')
                if new_status and order.mylerz_status != new_status:
                    order.mylerz_status = new_status
                    order.save(update_fields=['mylerz_status'])
        return Response(res)

    @action(detail=True, methods=['post'])
    def mylerz_cancel(self, request, pk=None):
        order = self.get_object()
        if not order.mylerz_barcode:
            return Response({'error': 'Aucun code-barres Mylerz pour cette commande.'}, status=400)
        from . import mylerz_service
        res = mylerz_service.cancel_shipment(order.mylerz_barcode)
        if res.get('success'):
            order.mylerz_status = 'Cancelled on Mylerz'
            order.save(update_fields=['mylerz_status'])
            OrderStatusHistory.objects.create(
                order=order,
                status=order.status,
                notes=f"Envoi Mylerz annulé."
            )
            return Response(res)
        return Response(res, status=400)

    @action(detail=False, methods=['post'])
    def bulk_mylerz_ship(self, request):
        try:
            ids = request.data.get('ids', [])
            if not ids:
                return Response({'error': 'Aucun ID fourni.'}, status=400)
            from . import mylerz_service
            # Check credentials first
            if not mylerz_service.MYLERZ_USERNAME or not mylerz_service.MYLERZ_PASSWORD:
                return Response({'error': 'Credentials Mylerz non configurés sur le serveur (MYLERZ_USERNAME / MYLERZ_PASSWORD manquants dans le .env).'}, status=400)
            orders = Order.objects.filter(id__in=ids)
            results = []
            for order in orders:
                if order.mylerz_barcode:
                    results.append({'id': order.id, 'success': False, 'error': 'Déjà envoyé', 'message': 'Déjà envoyé'})
                    continue
                try:
                    res = mylerz_service.create_shipment(order)
                except Exception as e:
                    results.append({'id': order.id, 'success': False, 'message': str(e)})
                    continue
                if res.get('success'):
                    order.mylerz_barcode = res.get('barcode') or ''
                    order.mylerz_pickup_code = res.get('pickup_code') or ''
                    order.mylerz_status = 'Shipment Created'
                    order.save(update_fields=['mylerz_barcode', 'mylerz_pickup_code', 'mylerz_status'])
                    OrderStatusHistory.objects.create(
                        order=order, status=order.status,
                        notes=f"Colis Mylerz généré en masse. Barcode: {order.mylerz_barcode}"
                    )
                res['id'] = order.id
                results.append(res)
            return Response({'results': results})
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            return Response({'error': f"CRASH: {str(e)}\n\n{tb}"}, status=400)
    @action(detail=False, methods=['post'])
    def bulk_mylerz_track(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'Aucun ID fourni.'}, status=400)
        orders = Order.objects.filter(id__in=ids).exclude(mylerz_barcode='')
        from . import mylerz_service
        updated = 0
        for order in orders:
            res = mylerz_service.track_shipment(order.mylerz_barcode)
            if res.get('success'):
                tracking = res.get('tracking', [])
                if tracking:
                    latest = tracking[0]
                    new_status = latest.get('Status') or latest.get('status')
                    if new_status and order.mylerz_status != new_status:
                        order.mylerz_status = new_status
                        order.save(update_fields=['mylerz_status'])
                        updated += 1
        return Response({'success': True, 'updated': updated})

    @action(detail=False, methods=['post'])
    def bulk_mylerz_cancel(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'Aucun ID fourni.'}, status=400)
        orders = Order.objects.filter(id__in=ids).exclude(mylerz_barcode='')
        from . import mylerz_service
        results = []
        for order in orders:
            res = mylerz_service.cancel_shipment(order.mylerz_barcode)
            if res.get('success'):
                order.mylerz_status = 'Cancelled on Mylerz'
                order.save(update_fields=['mylerz_status'])
                OrderStatusHistory.objects.create(order=order, status=order.status, notes="Envoi Mylerz annulé (en masse).")
            res['id'] = order.id
            results.append(res)
        return Response({'results': results})

    @action(detail=False, methods=['get'])
    def unviewed_counts(self, request):
        unviewed_orders = Order.objects.filter(is_viewed=False)
        normal_count = unviewed_orders.exclude(customer__is_b2b=True).count()
        b2b_count = unviewed_orders.filter(customer__is_b2b=True).count()
        return Response({
            'normal': normal_count,
            'b2b': b2b_count
        })

    @action(detail=False, methods=['post'])
    def mark_viewed(self, request):
        order_type = request.data.get('type')
        qs = Order.objects.filter(is_viewed=False)
        if order_type == 'b2b':
            qs = qs.filter(customer__is_b2b=True)
        else:
            qs = qs.exclude(customer__is_b2b=True)
        updated = qs.update(is_viewed=True)
        return Response({'success': True, 'updated': updated})

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'Aucun ID fourni.'}, status=status.HTTP_400_BAD_REQUEST)
        updated_count = Order.objects.filter(id__in=ids).update(
            is_deleted=True,
            deleted_at=timezone.now(),
            deleted_by=request.user
        )
        return Response({'message': f'{updated_count} commande(s) supprimée(s).'})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = request.user
        instance.save()
        
        from ..models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f'Suppression (soft) de la commande #{instance.id}',
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT')
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        ids = request.data.get('ids', [])
        new_status = request.data.get('status')
        if not ids or not new_status:
            return Response({'error': 'IDs ou nouveau statut manquant.'}, status=status.HTTP_400_BAD_REQUEST)
        
        orders = Order.objects.filter(id__in=ids)
        updated_count = 0
        for order in orders:
            if order.status != new_status:
                old_status = order.status
                order.status = new_status
                order.save(update_fields=['status'])
                OrderStatusHistory.objects.create(
                    order=order,
                    status=new_status,
                    notes="Statut modifié en masse."
                )
                handle_loyalty_points(order, old_status, new_status)
                
                # --- MYLERZ AUTO-SHIP ---
                if new_status == 'confirmed' and not order.mylerz_barcode:
                    from . import mylerz_service
                    def async_mylerz_ship(order_id):
                        try:
                            from ..models import Order, OrderStatusHistory
                            o = Order.objects.get(id=order_id)
                            res = mylerz_service.create_shipment(o)
                            if res.get('success'):
                                o.mylerz_barcode = res.get('barcode') or ''
                                o.mylerz_pickup_code = res.get('pickup_code') or ''
                                o.mylerz_status = 'Shipment Created'
                                o.save(update_fields=['mylerz_barcode', 'mylerz_pickup_code', 'mylerz_status'])
                                OrderStatusHistory.objects.create(
                                    order=o,
                                    status=o.status,
                                    notes=f"Colis Mylerz généré auto (en masse). Barcode: {o.mylerz_barcode}"
                                )
                            else:
                                msg = res.get('message', 'Erreur inconnue')
                                OrderStatusHistory.objects.create(
                                    order=o,
                                    status=o.status,
                                    notes=f"Échec de création du colis Mylerz : {msg}"
                                )
                        except Exception as e:
                            logger.warning('%s: %s', __name__, e)
                    import threading
                    threading.Thread(target=async_mylerz_ship, args=(order.id,)).start()
                
                updated_count += 1
                
        return Response({'message': f'{updated_count} commande(s) mise(s) à jour.'})

    @action(detail=False, methods=['post'])
    def bulk_export_excel(self, request):
        import openpyxl
        ids = request.data.get('ids', [])
        qs = Order.objects.filter(id__in=ids).order_by('-created_at') if ids else self.get_queryset()
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Commandes"
        ws.append(['ID', 'Date', 'Client', 'Telephone', 'Wilaya', 'Livraison', 'Statut', 'Paiement', 'Total'])

        for o in qs:
            customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invité')
            phone = o.user.profile.phone if o.user and hasattr(o.user, 'profile') else o.guest_phone
            # ensure naive datetime if needed, or openpyxl can handle timezone-aware datetime
            from django.utils.timezone import localtime
            local_dt = localtime(o.created_at)
            
            # Remove timezone info so Excel handles it correctly
            local_dt_naive = local_dt.replace(tzinfo=None)
            
            ws.append([
                o.id,
                local_dt_naive,
                customer,
                phone,
                o.wilaya,
                o.get_delivery_type_display(),
                o.get_status_display(),
                o.get_payment_status_display(),
                float(o.total)
            ])
            
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="commandes_export.xlsx"'
        wb.save(response)
        return response

    @action(detail=False, methods=['post'])
    def bulk_packing_slips(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'Aucun ID fourni.'}, status=status.HTTP_400_BAD_REQUEST)
        
        orders = Order.objects.filter(id__in=ids).select_related('user').prefetch_related('items')
        
        # Mylerz AWB style HTML rendering for printing
        html = """
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; font-size: 13px; color: #000; margin: 0; padding: 0; background: #f0f0f0; }
                .label-container { 
                    width: 10.5cm; /* Standard shipping label width */
                    height: 15cm; 
                    background: #fff; 
                    margin: 20px auto; 
                    padding: 15px; 
                    box-sizing: border-box; 
                    page-break-after: always;
                    border: 1px solid #ccc;
                    position: relative;
                }
                @media print {
                    body { background: #fff; }
                    .label-container { border: none; margin: 0; padding: 10px; width: 100%; height: auto; min-height: 14cm; }
                }
                .label-container:last-child { page-break-after: auto; }
                
                .header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
                .brand { font-size: 22px; font-weight: 900; letter-spacing: 1px; }
                .order-id { font-size: 16px; font-weight: 700; background: #000; color: #fff; padding: 4px 8px; border-radius: 4px; }
                
                .barcode-box { text-align: center; margin: 15px 0; padding: 10px; border: 2px dashed #000; border-radius: 6px; }
                .barcode-box img { max-width: 100%; height: 60px; }
                .tracking-number { font-size: 16px; font-weight: bold; letter-spacing: 2px; margin-top: 5px; }
                
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
                .info-box { border: 1px solid #000; padding: 8px; border-radius: 4px; }
                .info-box h3 { margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 3px; color: #555; }
                .info-box p { margin: 3px 0; font-size: 12px; }
                .info-box strong { font-size: 13px; }
                
                .cod-box { background: #000; color: #fff; text-align: center; padding: 12px; margin: 15px 0; border-radius: 4px; }
                .cod-box.paid { background: #10b981; }
                .cod-box .amount { font-size: 24px; font-weight: 900; margin-top: 5px; }
                .cod-box .status { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
                
                .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                .items-table th, .items-table td { border: 1px solid #ccc; padding: 5px; text-align: left; }
                .items-table th { background: #f8f8f8; font-weight: 600; text-transform: uppercase; }
                
                .footer { position: absolute; bottom: 15px; left: 15px; right: 15px; text-align: center; font-size: 10px; color: #666; border-top: 1px dashed #ccc; padding-top: 5px; }
            </style>
        </head>
        <body onload="window.print()">
        """
        
        for o in orders:
            customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invité')
            phone = o.user.profile.phone if o.user and hasattr(o.user, 'profile') else o.guest_phone
            
            barcode_val = o.mylerz_barcode or f"CMD-{o.id}"
            barcode_url = f"https://barcode.tec-it.com/barcode.ashx?data={barcode_val}&code=Code128"
            
            # Payment text
            is_paid = o.payment_status == 'paid' or o.payment_method == 'cib'
            payment_text = "PAYÉ EN LIGNE" if is_paid else "MONTANT À ENCAISSER (C.O.D)"
            cod_amount = "0 DA" if is_paid else f"{float(o.total)} DA"
            cod_class = "cod-box paid" if is_paid else "cod-box"
            
            mylerz_label = "Mylerz Tracking" if o.mylerz_barcode else "Order Barcode"
            
            html += f"""
            <div class="label-container">
                <div class="header-row">
                    <div class="brand">PIOVÉ</div>
                    <div class="order-id">CMD #{o.id}</div>
                </div>
                
                <div class="barcode-box">
                    <img src="{barcode_url}" alt="Barcode" />
                    <div class="tracking-number">{barcode_val}</div>
                    <div style="font-size:10px; margin-top:2px;">{mylerz_label}</div>
                </div>
                
                <div class="info-grid">
                    <div class="info-box">
                        <h3>Expéditeur</h3>
                        <p><strong>PIOVÉ COSMETICS</strong></p>
                        <p>Alger, Algérie</p>
                        <p>Tél: 07 83 77 36 59</p>
                    </div>
                    <div class="info-box">
                        <h3>Destinataire</h3>
                        <p><strong>{customer}</strong></p>
                        <p>Tél: <strong>{phone}</strong></p>
                        <p>{o.shipping_address}</p>
                        <p><strong>{o.wilaya}</strong></p>
                    </div>
                </div>
                
                <div class="{cod_class}">
                    <div class="status">{payment_text}</div>
                    <div class="amount">{cod_amount}</div>
                </div>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 40px; text-align: center;">QTE</th>
                            <th>PRODUIT</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            
            for item in o.items.all():
                sku = ''
                if item.variant:
                    sku = item.variant.sku or item.variant.name or ''
                ref_display = f'<br><span style="font-size:10px;color:#555;font-style:italic;">{item.variant_name or sku}</span>' if (item.variant_name or sku) else ''
                html += f"""
                        <tr>
                            <td style="font-weight: bold; text-align: center;">{item.quantity}x</td>
                            <td>{item.product_name}{ref_display}</td>
                        </tr>
                """
                
            html += f"""
                    </tbody>
                </table>
                
                <div class="footer">
                    Généré le {o.created_at.strftime('%d/%m/%Y %H:%M')} | Piové Cosmetics
                </div>
            </div>
            """
            
        html += "</body></html>"
        return HttpResponse(html)

    @action(detail=False, methods=['post'])
    def create_order(self, request):
        data = request.data
        items_data = data.get('items', [])
        if not items_data:
            return Response({'error': 'Aucun produit sélectionné.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Handle Customer
        customer_id = data.get('customer_id')
        phone = data.get('guest_phone', '')
        customer_obj = None
        user_obj = None

        if customer_id:
            try:
                customer_obj = Customer.objects.get(pk=customer_id)
                # If this customer has a linked user, find it (Piove links User Profile to Customer via phone/email, or just keep user_obj=None if not strictly needed)
                # In Piove, Customer model doesn't strictly have a OneToOne to User. The Order links to user via request.user for storefront. 
                # But we can try to find User by phone if needed. Let's just use customer_obj.
            except Customer.DoesNotExist:
                return Response({'error': 'Client introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        elif phone:
            customer_name = data.get('guest_name', '')
            customer_obj, created = Customer.objects.get_or_create(
                phone=phone,
                defaults={'name': customer_name, 'email': data.get('guest_email', '')}
            )
            if not created and not customer_obj.name and customer_name:
                customer_obj.name = customer_name
                customer_obj.save(update_fields=['name'])
        else:
            return Response({'error': 'Le numéro de téléphone est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Handle Delivery
        delivery_company_id = data.get('delivery_company_id')
        wilaya = data.get('wilaya')
        delivery_cost = 0
        delivery_company_name = ''
        
        if delivery_company_id and wilaya:
            try:
                company = DeliveryCompany.objects.get(pk=delivery_company_id, is_active=True)
                rate = DeliveryRate.objects.get(company=company, wilaya_name=wilaya)
                delivery_company_name = company.name
                if data.get('delivery_type') == 'desk':
                    delivery_cost = rate.price_desk
                else:
                    delivery_cost = rate.price_home
            except (DeliveryCompany.DoesNotExist, DeliveryRate.DoesNotExist):
                pass
        
        # 3. Create Order
        is_b2b = data.get('is_b2b', False)
        if customer_obj and customer_obj.is_b2b:
            is_b2b = True

        order = Order.objects.create(
            user=user_obj,
            customer=customer_obj,
            guest_name=data.get('guest_name', customer_obj.name if customer_obj else ''),
            guest_phone=phone,
            guest_email=data.get('guest_email', customer_obj.email if customer_obj else ''),
            shipping_address=data.get('shipping_address', ''),
            wilaya=wilaya,
            city=data.get('city', ''),
            delivery_company_name=delivery_company_name,
            delivery_cost=delivery_cost,
            delivery_type=data.get('delivery_type', 'home'),
            payment_method=data.get('payment_method', 'cash'),
            discount_amount=data.get('discount_amount', 0),
            status='confirmed', # Default status for admin created orders
        )

        # 4. Create Items & Calculate Total
        total = 0
        from ..models import Product as ProductModel, ProductVariant
        
        for item_data in items_data:
            try:
                product = ProductModel.objects.get(pk=item_data['product_id'], is_active=True)
            except ProductModel.DoesNotExist:
                order.delete()
                return Response({'error': f"Produit {item_data['product_id']} introuvable."}, status=status.HTTP_400_BAD_REQUEST)

            variant = None
            if item_data.get('variant_id'):
                try:
                    variant = ProductVariant.objects.get(pk=item_data['variant_id'], product=product)
                except ProductVariant.DoesNotExist:
                    pass

            if is_b2b:
                price = product.b2b_price if product.b2b_price else (product.effective_price * (product.units_per_carton or 1))
            else:
                price = product.effective_price
                
            qty = item_data.get('quantity', 1)

            OrderItem.objects.create(
                order=order,
                product=product,
                variant=variant,
                product_name=product.name,
                variant_name=variant.name if variant else '',
                quantity=qty,
                price_at_purchase=price,
            )
            total += price * qty

        # 5. Finalize Total
        order.total = total + delivery_cost - order.discount_amount
        order.save(update_fields=['total'])

        OrderStatusHistory.objects.create(
            order=order,
            status='confirmed',
            notes='Commande créée manuellement par un administrateur.'
        )
        
        # 6. Send Email
        recipient_email = order.guest_email or (order.customer.email if order.customer else None)
        if recipient_email:
            def send_order_email(order_id, recipient):
                try:
                    from ..models import Order
                    o = Order.objects.prefetch_related('items').get(id=order_id)
                    subject = f"Confirmation de commande #{o.id} - Piové Cosmetics"
                    text_content = render_to_string('emails/order_confirmation.txt', {'order': o})
                    html_content = render_to_string('emails/order_confirmation.html', {'order': o})
                    msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [recipient])
                    msg.attach_alternative(html_content, "text/html")
                    msg.send(fail_silently=True)
                except Exception:
                    pass
            threading.Thread(target=send_order_email, args=(order.id, recipient_email)).start()

        return Response(AdminOrderSerializer(order).data, status=status.HTTP_201_CREATED)


