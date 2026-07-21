from ._base import *

# ─── Orders ───────────────────────────────────────────────────────────────────
class ApplyCouponView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get('code')
        cart_total = request.data.get('cart_total')
        cart_items = request.data.get('cart_items', [])  # needed for BOGO
        
        if not code or cart_total is None:
            return Response({'error': 'Code promo et total du panier requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cart_total = Decimal(str(cart_total))
        except:
            return Response({'error': 'Total invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            coupon = Coupon.objects.get(code__iexact=code)
        except Coupon.DoesNotExist:
            return Response({'error': 'Code promo invalide.'}, status=status.HTTP_404_NOT_FOUND)

        if not coupon.is_valid():
            return Response({'error': 'Ce code promo est expiré ou a atteint sa limite d\'utilisation.'}, status=status.HTTP_400_BAD_REQUEST)

        if coupon.min_order_value and cart_total < coupon.min_order_value:
            return Response({'error': f'Ce code nécessite un minimum d\'achat de {coupon.min_order_value} DA.'}, status=status.HTTP_400_BAD_REQUEST)

        discount_amount = Decimal('0')

        if coupon.discount_type == 'percentage':
            discount_amount = (cart_total * coupon.discount_value) / Decimal('100')
        elif coupon.discount_type == 'fixed':
            discount_amount = coupon.discount_value
        elif coupon.discount_type == 'bogo':
            # BOGO logic: Achetez buy_quantity, Obtenez get_quantity gratuits.
            # On simplifie en supposant que l'article le moins cher est offert,
            # ou on donne une remise fixe. L'implémentation complète nécessite d'analyser cart_items.
            # For this simple pass, let's just sort cart items by price asc and offer the cheapest ones
            # proportional to buy_quantity/get_quantity.
            if not coupon.buy_quantity or not coupon.get_quantity:
                return Response({'error': 'Configuration BOGO invalide sur ce code.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Count total eligible items in cart (assuming all products eligible)
            total_items_count = sum(int(item.get('quantity', 1)) for item in cart_items)
            if total_items_count >= coupon.buy_quantity:
                # Find the cheapest items
                flat_prices = []
                for item in cart_items:
                    price = Decimal(str(item.get('price', 0)))
                    qty = int(item.get('quantity', 1))
                    flat_prices.extend([price] * qty)
                flat_prices.sort() # lowest first
                
                # How many sets of (buy+get) do we have? Actually, if you buy X, you get Y. 
                # Meaning for every X paid, you can get Y free.
                sets_count = total_items_count // (coupon.buy_quantity + coupon.get_quantity)
                # Or simply: if you have at least buy_quantity, you get get_quantity items for free.
                free_items_allowed = (total_items_count // coupon.buy_quantity) * coupon.get_quantity
                
                # We can only give away as many free items as they actually have in cart
                free_items_to_give = min(free_items_allowed, len(flat_prices))
                
                discount_amount = sum(flat_prices[:free_items_to_give])

        # Ensure discount doesn't exceed cart total
        discount_amount = min(discount_amount, cart_total)

        return Response({
            'success': True,
            'coupon_id': coupon.id,
            'code': coupon.code,
            'discount_type': coupon.discount_type,
            'discount_amount': discount_amount,
            'new_total': cart_total - discount_amount
        })

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Order.objects.filter(user=self.request.user).prefetch_related('items')
        return Order.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        return OrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        items_data = data.pop('items')
        payment_method = data.pop('payment_method', 'cash')
        coupon_id = data.pop('coupon_id', None)
        discount_amount = data.pop('discount_amount', 0)

        # Calculate delivery cost
        delivery_company_id = data.pop('delivery_company_id', None)
        delivery_cost = 0
        delivery_company_name = ''
        
        if delivery_company_id and data.get('wilaya'):
            try:
                company = DeliveryCompany.objects.get(pk=delivery_company_id, is_active=True)
                rate = DeliveryRate.objects.get(company=company, wilaya_name=data['wilaya'])
                delivery_company_name = company.name
                if data.get('delivery_type') == 'desk':
                    delivery_cost = rate.price_desk
                else:
                    delivery_cost = rate.price_home
            except (DeliveryCompany.DoesNotExist, DeliveryRate.DoesNotExist):
                pass
                
        # Link or create customer based on phone
        phone = data.get('guest_phone', '')
        if request.user and request.user.is_authenticated:
            phone = request.user.profile.phone if hasattr(request.user, 'profile') else phone
            
        customer_obj = None
        if phone:
            customer_name = data.get('guest_name', '')
            if request.user and request.user.is_authenticated:
                customer_name = request.user.get_full_name() or request.user.username
            customer_obj, created = Customer.objects.get_or_create(
                phone=phone,
                defaults={'name': customer_name, 'email': data.get('guest_email', '')}
            )
            # Update name/email if empty
            if not created:
                if not customer_obj.name and customer_name:
                    customer_obj.name = customer_name
                    customer_obj.save(update_fields=['name'])

        # Create order
        order = Order.objects.create(
            user=request.user if request.user.is_authenticated else None,
            customer=customer_obj,
            delivery_company_name=delivery_company_name,
            delivery_cost=delivery_cost,
            payment_method=payment_method,
            coupon_id=coupon_id,
            discount_amount=discount_amount,
            **data
        )

        if coupon_id:
            try:
                c = Coupon.objects.get(pk=coupon_id)
                c.times_used += 1
                c.save(update_fields=['times_used'])
            except Coupon.DoesNotExist:
                pass

        # Create items
        total = 0
        for item_data in items_data:
            from ..models import Product as ProductModel, ProductVariant
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

            is_b2b = request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.is_b2b
            if is_b2b:
                price = product.b2b_price if product.b2b_price else (product.effective_price * (product.units_per_carton or 1))
            else:
                price = product.effective_price
                
            qty = item_data['quantity']

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

        order.total = total + delivery_cost
        order.save(update_fields=['total'])

        # Create initial history status
        OrderStatusHistory.objects.create(
            order=order,
            status='pending',
            notes='Commande reçue et en attente de traitement.'
        )

        # Send confirmation email
        recipient_email = getattr(order, 'guest_email', None)
        if not recipient_email and order.user:
            recipient_email = order.user.email

        if recipient_email:
            def send_order_email(order_id, recipient):
                try:
                    # Need to re-fetch to get all relations in the thread
                    from ..models import Order
                    o = Order.objects.prefetch_related('items').get(id=order_id)
                    subject = f"Confirmation de commande #{o.id} - Piové Cosmetics"
                    text_content = render_to_string('emails/order_confirmation.txt', {'order': o})
                    html_content = render_to_string('emails/order_confirmation.html', {'order': o})
                    
                    # Send BCC to admin for every new order
                    admin_email = 'lbetaimi@piovecosmetics.com'
                    msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [recipient], bcc=[admin_email])
                    msg.attach_alternative(html_content, "text/html")
                    msg.send(fail_silently=True)
                except Exception as e:
                    pass
            
            threading.Thread(target=send_order_email, args=(order.id, recipient_email)).start()

        # ── CIB / Edahabia via SATIM ──────────────────────────────────────────
        if order.payment_method == 'cib':
            from ..satim_service import register_order
            satim_res = register_order(order)
            if satim_res.get('success'):
                return Response({
                    **OrderSerializer(order).data,
                    'satim_payment_url': satim_res.get('formUrl')
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    **OrderSerializer(order).data,
                    'satim_error': satim_res.get('message'),
                    'satim_raw':   satim_res.get('raw'),
                }, status=status.HTTP_201_CREATED)

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


