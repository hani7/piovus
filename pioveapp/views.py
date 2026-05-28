from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Sum, Count
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User

from .models import (
    Category, Product, ProductVariant, Banner, Order, OrderItem, Review, UserProfile
)
from .serializers import (
    CategorySerializer,
    ProductListSerializer, ProductDetailSerializer,
    BannerSerializer,
    UserSerializer, RegisterSerializer,
    OrderSerializer, OrderCreateSerializer,
    ReviewSerializer,
    AdminProductSerializer, AdminProductVariantSerializer, AdminCategorySerializer,
    AdminBannerSerializer, AdminOrderSerializer, AdminOrderStatusSerializer,
)


# ─── Categories ──────────────────────────────────────────────────────────────
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    lookup_field = 'slug'


# ─── Products ─────────────────────────────────────────────────────────────────
class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True).select_related('category').prefetch_related('images', 'variants', 'reviews')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category__slug', 'is_featured', 'is_new']
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at', 'name']
    ordering = ['-created_at']
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    @action(detail=False, methods=['get'], url_path='featured')
    def featured(self, request):
        qs = self.get_queryset().filter(is_featured=True)[:8]
        serializer = ProductListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='new-arrivals')
    def new_arrivals(self, request):
        qs = self.get_queryset().filter(is_new=True)[:8]
        serializer = ProductListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by-category/(?P<slug>[^/.]+)')
    def by_category(self, request, slug=None):
        qs = self.get_queryset().filter(category__slug=slug)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = ProductListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = ProductListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reviews', permission_classes=[IsAuthenticated])
    def add_review(self, request, slug=None):
        product = self.get_object()
        serializer = ReviewSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(product=product, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Banners ──────────────────────────────────────────────────────────────────
class BannerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Banner.objects.filter(is_active=True)
    serializer_class = BannerSerializer


# ─── Auth ─────────────────────────────────────────────────────────────────────
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        return Response({'error': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass
        return Response({'message': 'Déconnecté avec succès.'})


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ─── Orders ───────────────────────────────────────────────────────────────────
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

        # Create order
        order = Order.objects.create(
            user=request.user if request.user.is_authenticated else None,
            **data
        )

        # Create items
        total = 0
        for item_data in items_data:
            from .models import Product as ProductModel, ProductVariant
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

        order.total = total
        order.save(update_fields=['total'])

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


# ─── Admin Views ──────────────────────────────────────────────────────────────

class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status='pending').count()
        total_revenue = Order.objects.exclude(status='cancelled').aggregate(
            rev=Sum('total')
        )['rev'] or 0
        total_products = Product.objects.count()
        active_products = Product.objects.filter(is_active=True).count()
        total_categories = Category.objects.count()

        recent_orders = Order.objects.select_related('user').prefetch_related('items')[:10]
        recent_serialized = AdminOrderSerializer(recent_orders, many=True).data

        # Orders per status
        status_counts = {
            s: Order.objects.filter(status=s).count()
            for s, _ in Order.STATUS_CHOICES
        }

        return Response({
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'total_revenue': float(total_revenue),
            'total_products': total_products,
            'active_products': active_products,
            'total_categories': total_categories,
            'status_counts': status_counts,
            'recent_orders': recent_serialized,
        })


class AdminProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().select_related('category').order_by('-created_at')
    serializer_class = AdminProductSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['category', 'is_active', 'is_featured', 'is_new']
    ordering_fields = ['created_at', 'price', 'stock', 'name']


class AdminProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.all().select_related('product').order_by('id')
    serializer_class = AdminProductVariantSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product']


class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('order', 'name')
    serializer_class = AdminCategorySerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class AdminBannerViewSet(viewsets.ModelViewSet):
    queryset = Banner.objects.all().order_by('order')
    serializer_class = AdminBannerSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class AdminOrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().select_related('user').prefetch_related('items').order_by('-created_at')
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status']
    search_fields = ['guest_name', 'guest_phone', 'user__username', 'user__first_name']
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'partial_update':
            return AdminOrderStatusSerializer
        return AdminOrderSerializer

