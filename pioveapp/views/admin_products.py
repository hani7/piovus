from ._base import *

# ─── Admin Views ──────────────────────────────────────────────────────────────

class ActivityLogMixin:
    def perform_create(self, serializer):
        instance = serializer.save()
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            model_name = instance.__class__._meta.verbose_name or instance.__class__.__name__
            from ..models import UserActivityLog
            UserActivityLog.objects.create(
                user=self.request.user,
                action=f"Création : {model_name} (ID: {instance.pk})",
                ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
            )

    def perform_update(self, serializer):
        instance = serializer.save()
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            model_name = instance.__class__._meta.verbose_name or instance.__class__.__name__
            from ..models import UserActivityLog
            UserActivityLog.objects.create(
                user=self.request.user,
                action=f"Modification : {model_name} (ID: {instance.pk})",
                ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
            )

    def perform_destroy(self, instance):
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            model_name = instance.__class__._meta.verbose_name or instance.__class__.__name__
            from ..models import UserActivityLog
            UserActivityLog.objects.create(
                user=self.request.user,
                action=f"Suppression : {model_name} (ID: {instance.pk})",
                ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
            )
        instance.delete()

class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Q

        # ── Statuses that represent real revenue ─────────────────────────────
        # COD: uniquement 'fulfilled' (livré + payé en main propre)
        # CIB/Edahabia: payment_status = 'paid' (callback SATIM confirmé)
        REVENUE_Q = (
            Q(payment_method='cash', status='fulfilled', is_deleted=False) |
            Q(payment_method='cib', payment_status='paid', is_deleted=False)
        )

        total_orders   = Order.objects.filter(is_deleted=False).count()
        pending_orders = Order.objects.filter(status='pending', is_deleted=False).count()

        # Revenues — only real confirmed/paid orders
        total_revenue  = Order.objects.filter(REVENUE_Q).aggregate(rev=Sum('total'))['rev'] or 0

        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_revenue = Order.objects.filter(REVENUE_Q, created_at__gte=today).aggregate(rev=Sum('total'))['rev'] or 0

        seven_days_ago = timezone.now() - timedelta(days=6)
        seven_days_ago_start = seven_days_ago.replace(hour=0, minute=0, second=0, microsecond=0)
        weekly_revenue = Order.objects.filter(REVENUE_Q, created_at__gte=seven_days_ago_start).aggregate(rev=Sum('total'))['rev'] or 0

        # AOV & Conversion Rate
        confirmed_count = Order.objects.filter(REVENUE_Q).count()
        average_order_value = float(total_revenue) / confirmed_count if confirmed_count > 0 else 0
        total_customers = Customer.objects.count()
        conversion_rate = (total_orders / total_customers * 100) if total_customers > 0 else 0

        total_products   = Product.objects.count()
        active_products  = Product.objects.filter(is_active=True).count()
        total_categories = Category.objects.count()

        recent_orders = Order.objects.select_related('user', 'customer').prefetch_related('items').order_by('-created_at')[:10]
        recent_serialized = AdminOrderSerializer(recent_orders, many=True).data

        # Urgent Alerts
        out_of_stock_products = Product.objects.filter(stock__lte=F('min_stock_alert')).values('id', 'name', 'stock')[:10]
        out_of_stock_variants = ProductVariant.objects.filter(stock__lte=F('product__min_stock_alert')).select_related('product')[:10]
        out_of_stock_list = list(out_of_stock_products) + [{'id': v.product.id, 'name': f"{v.product.name} ({v.name})", 'stock': v.stock} for v in out_of_stock_variants]

        fraud_orders = Order.objects.filter(status='pending', customer__is_blacklisted=True).order_by('-created_at')[:10]
        fraud_serialized = AdminOrderSerializer(fraud_orders, many=True).data

        # Orders per status
        status_counts = {
            s: Order.objects.filter(status=s).count()
            for s, _ in Order.STATUS_CHOICES
        }
        # Add payment breakdown
        payment_counts = {
            'satim_paid':    Order.objects.filter(payment_method='cib', payment_status='paid').count(),
            'satim_pending': Order.objects.filter(payment_method='cib', payment_status='unpaid').count(),
            'cod_total':     Order.objects.filter(payment_method='cash').count(),
        }

        # 7-day trends (only real revenue)
        recent_trend_orders = Order.objects.filter(created_at__gte=seven_days_ago_start)

        trends = []
        for i in range(7):
            d = (seven_days_ago_start + timedelta(days=i)).date()
            day_orders = recent_trend_orders.filter(created_at__date=d)
            trends.append({
                'date': d.strftime('%Y-%m-%d'),
                'revenue': float(day_orders.filter(REVENUE_Q).aggregate(r=Sum('total'))['r'] or 0),
                'orders': day_orders.count()
            })

        return Response({
            'total_orders':        total_orders,
            'pending_orders':      pending_orders,
            'total_revenue':       float(total_revenue),
            'daily_revenue':       float(daily_revenue),
            'weekly_revenue':      float(weekly_revenue),
            'average_order_value': float(average_order_value),
            'conversion_rate':     float(conversion_rate),
            'total_products':      total_products,
            'active_products':     active_products,
            'total_categories':    total_categories,
            'status_counts':       status_counts,
            'payment_counts':      payment_counts,
            'recent_orders':       recent_serialized,
            'urgent_alerts': {
                'out_of_stock': out_of_stock_list[:10],
                'fraud_orders': fraud_serialized,
            },
            'trends':          trends,
            'total_customers': total_customers,
        })


class AdminProductViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    queryset = Product.objects.all().prefetch_related('categories').order_by('-created_at')
    serializer_class = AdminProductSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['categories', 'is_active', 'is_featured', 'is_new']
    ordering_fields = ['created_at', 'price', 'stock', 'name']

    @action(detail=False, methods=['patch'])
    def bulk_update(self, request):
        products_data = request.data.get('products', [])
        updated = 0
        from django.db import transaction
        with transaction.atomic():
            for data in products_data:
                pid = data.get('id')
                if not pid:
                    continue
                try:
                    product = Product.objects.get(pk=pid)
                    if 'price' in data: product.price = data['price']
                    if 'promo_price' in data: product.promo_price = data['promo_price'] or None
                    if 'b2b_price' in data: product.b2b_price = data['b2b_price'] or None
                    if 'stock' in data: product.stock = data['stock']
                    product.save(update_fields=['price', 'promo_price', 'b2b_price', 'stock'])
                    updated += 1
                except Product.DoesNotExist:
                    pass
        
        from ..models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f"Mise à jour groupée de {updated} produit(s)",
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT')
        )
        return Response({'message': f'{updated} produits mis à jour avec succès.', 'updated': updated})


class AdminProductVariantViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    queryset = ProductVariant.objects.all().select_related('product').order_by('id')
    serializer_class = AdminProductVariantSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product']


class AdminProductImageViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    queryset = ProductImage.objects.all().select_related('product').order_by('order', 'id')
    serializer_class = AdminProductImageSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product']

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        items = request.data.get('items', [])
        from django.db import transaction
        with transaction.atomic():
            for item in items:
                img_id = item.get('id')
                order = item.get('order')
                if img_id is not None and order is not None:
                    try:
                        ProductImage.objects.filter(pk=img_id).update(order=order)
                    except Exception:
                        pass
                        
        from ..models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f"Réorganisation des images de la galerie",
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT')
        )
        return Response({'message': 'Ordre mis à jour avec succès.'})

class AdminCategoryViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('order', 'name')
    serializer_class = AdminCategorySerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class AdminBannerViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    serializer_class = AdminBannerSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        from django.db import OperationalError as DBOperationalError
        try:
            qs = Banner.objects.all().order_by('order')
            list(qs[:1])  # force evaluate to catch DB errors early
            return qs
        except (DBOperationalError, Exception):
            # Fallback: defer category if column missing in prod DB
            try:
                return Banner.objects.defer('category').all().order_by('order')
            except Exception:
                return Banner.objects.none()


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
