from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from decimal import Decimal
import csv
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
import threading
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.utils.crypto import get_random_string
from django.utils import timezone
from datetime import timedelta
from .models import (
    Category, Product, ProductImage, ProductVariant, Banner, Order, OrderItem, Review, UserProfile,
    DeliveryCompany, DeliveryRate, Customer, OrderStatusHistory, Coupon
)
from .serializers import (
    CategorySerializer,
    ProductListSerializer, ProductDetailSerializer,
    BannerSerializer,
    UserSerializer, RegisterSerializer,
    OrderSerializer, OrderCreateSerializer,
    ReviewSerializer,
    AdminProductSerializer, AdminProductVariantSerializer, AdminProductImageSerializer, AdminCategorySerializer,
    AdminBannerSerializer, AdminOrderSerializer, AdminOrderStatusSerializer, AdminOrderEditSerializer,
    DeliveryCompanySerializer, DeliveryRateSerializer, CustomerSerializer, CouponSerializer
)


# ÔöÇÔöÇÔöÇ Categories ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    lookup_field = 'slug'

    @method_decorator(cache_page(60 * 15))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)


# ÔöÇÔöÇÔöÇ Products ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True).prefetch_related('categories', 'images', 'variants', 'reviews')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'categories__slug': ['exact'],
        'is_featured': ['exact'],
        'is_new': ['exact'],
        'is_bestseller': ['exact'],
        'is_promotion': ['exact'],
        'price': ['gte', 'lte'],
    }
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at', 'name']
    ordering = ['-is_featured', '-created_at']
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    @action(detail=False, methods=['get'], url_path='featured')
    def featured(self, request):
        qs = self.get_queryset().filter(is_bestseller=True)[:8]
        serializer = ProductListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='new-arrivals')
    def new_arrivals(self, request):
        qs = self.get_queryset().filter(is_new=True)[:8]
        serializer = ProductListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='promotions')
    def promotions(self, request):
        qs = self.get_queryset().filter(is_promotion=True)[:8]
        serializer = ProductListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by-category/(?P<slug>[^/.]+)')
    def by_category(self, request, slug=None):
        qs = self.get_queryset().filter(categories__slug=slug)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = ProductListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = ProductListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def related(self, request, slug=None):
        product = self.get_object()
        qs = self.get_queryset().none()
        
        if product.categories.exists():
            qs = self.get_queryset().filter(categories__in=product.categories.all()).exclude(id=product.id).distinct()[:5]
            
        # Fallback if no products found in same category
        if not qs.exists():
            qs = self.get_queryset().exclude(id=product.id).order_by('?')[:5]
            
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


# ÔöÇÔöÇÔöÇ Banners ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
class BannerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Banner.objects.filter(is_active=True)
    serializer_class = BannerSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['placement']

    @method_decorator(cache_page(60 * 15))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)


# ÔöÇÔöÇÔöÇ Auth ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

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


class B2BRegisterView(generics.CreateAPIView):
    from .serializers import B2BRegisterSerializer
    serializer_class = B2BRegisterSerializer
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
            'message': 'Compte B2B cr├®├® avec succ├¿s. En attente de validation.'
        }, status=status.HTTP_201_CREATED)


from django.core.cache import cache

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            if hasattr(user, 'profile') and user.profile.is_b2b_pending:
                return Response({'error': 'Votre compte B2B est en cours de validation par nos ├®quipes. Vous serez notifi├® par email une fois valid├®.'}, status=status.HTTP_403_FORBIDDEN)

            # if user.is_staff or user.is_superuser:
            #     otp = get_random_string(6, allowed_chars='0123456789')
            #     cache.set(f'mfa_otp_{user.id}', otp, timeout=300) # 5 mins
            #     
            #     try:
            #         from django.core.mail import send_mail
            #         send_mail(
            #             'Code de s├®curit├® Piove',
            #             f'Votre code de connexion est : {otp}\nIl est valide pendant 5 minutes.',
            #             settings.DEFAULT_FROM_EMAIL,
            #             [user.email],
            #             fail_silently=True,
            #         )
            #     except Exception:
            #         pass
            #
            #     return Response({'mfa_required': True, 'user_id': user.id})

            refresh = RefreshToken.for_user(user)
            
            from .models import UserActivityLog
            UserActivityLog.objects.create(
                user=user,
                action='Connexion (Sans MFA)',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
            )
            
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        return Response({'error': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get('user_id')
        otp_input = request.data.get('otp')
        
        cached_otp = cache.get(f'mfa_otp_{user_id}')
        
        if not cached_otp or str(cached_otp) != str(otp_input):
            return Response({'error': 'Code invalide ou expir├®.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(id=user_id)
            cache.delete(f'mfa_otp_{user_id}')
            refresh = RefreshToken.for_user(user)
            
            from .models import UserActivityLog
            UserActivityLog.objects.create(
                user=user,
                action='Connexion (MFA)',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
            )
            
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            if request.user.is_authenticated:
                from .models import UserActivityLog
                UserActivityLog.objects.create(
                    user=request.user,
                    action='D├®connexion',
                    ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
                )
                
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            pass
        return Response({'message': 'D├®connect├® avec succ├¿s.'})


def handle_social_login(email, first_name, last_name):
    user = User.objects.filter(email=email).first()
    if not user:
        base_username = email.split('@')[0]
        username = base_username
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{get_random_string(4)}"
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password=get_random_string(16),
            first_name=first_name,
            last_name=last_name
        )
        UserProfile.objects.create(user=user)
        # Link or create customer (using dummy phone since phone is required by model, customer should update later)
        Customer.objects.get_or_create(
            email=email,
            defaults={'name': f"{first_name} {last_name}".strip(), 'phone': f"0000{get_random_string(6, '0123456789')}"}
        )
    refresh = RefreshToken.for_user(user)
    return {
        'user': UserSerializer(user).data,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')
        try:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request())
        except ValueError:
            # Mock fallback for demonstration if invalid real token
            if token == "mock_google_token":
                idinfo = {"email": "google_user@example.com", "given_name": "Google", "family_name": "User"}
            else:
                return Response({'error': 'Token Google invalide'}, status=status.HTTP_400_BAD_REQUEST)

        email = idinfo.get('email')
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')
        
        data = handle_social_login(email, first_name, last_name)
        return Response(data)


class FacebookLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')
        try:
            if token == "mock_facebook_token":
                profile = {"email": "facebook_user@example.com", "first_name": "Facebook", "last_name": "User"}
            else:
                resp = requests.get(f"https://graph.facebook.com/me?fields=email,first_name,last_name&access_token={token}")
                if resp.status_code != 200:
                    return Response({'error': 'Token Facebook invalide'}, status=status.HTTP_400_BAD_REQUEST)
                profile = resp.json()
        except Exception:
            return Response({'error': 'Erreur lors de la v├®rification'}, status=status.HTTP_400_BAD_REQUEST)

        email = profile.get('email')
        if not email:
            return Response({'error': 'Email requis (v├®rifiez vos permissions Facebook)'}, status=status.HTTP_400_BAD_REQUEST)
            
        first_name = profile.get('first_name', '')
        last_name = profile.get('last_name', '')
        
        data = handle_social_login(email, first_name, last_name)
        return Response(data)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not current_password or not new_password or not confirm_password:
            return Response({'error': 'Tous les champs sont requis.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(current_password):
            return Response({'error': 'Mot de passe actuel incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'error': 'Les nouveaux mots de passe ne correspondent pas.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({'error': 'Le mot de passe doit contenir au moins 6 caract├¿res.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        
        # Log action
        from .models import UserActivityLog
        UserActivityLog.objects.create(
            user=user,
            action="Changement de mot de passe",
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        return Response({'message': 'Mot de passe modifi├® avec succ├¿s.'})



# ÔöÇÔöÇÔöÇ Orders ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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
            return Response({'error': 'Ce code promo est expir├® ou a atteint sa limite d\'utilisation.'}, status=status.HTTP_400_BAD_REQUEST)

        if coupon.min_order_value and cart_total < coupon.min_order_value:
            return Response({'error': f'Ce code n├®cessite un minimum d\'achat de {coupon.min_order_value} DA.'}, status=status.HTTP_400_BAD_REQUEST)

        discount_amount = Decimal('0')

        if coupon.discount_type == 'percentage':
            discount_amount = (cart_total * coupon.discount_value) / Decimal('100')
        elif coupon.discount_type == 'fixed':
            discount_amount = coupon.discount_value
        elif coupon.discount_type == 'bogo':
            # BOGO logic: Achetez buy_quantity, Obtenez get_quantity gratuits.
            # On simplifie en supposant que l'article le moins cher est offert,
            # ou on donne une remise fixe. L'impl├®mentation compl├¿te n├®cessite d'analyser cart_items.
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
        user = self.request.user
        if not user.is_authenticated:
            return Order.objects.none()

        from django.db.models import Q
        # Match by user account OR by guest phone/email matching the user's profile
        q = Q(user=user)

        # Also match guest orders by phone
        try:
            phone = user.profile.phone
            if phone:
                q |= Q(guest_phone=phone) | Q(customer__phone=phone)
        except Exception:
            pass

        # Also match guest orders by email
        if user.email:
            q |= Q(guest_email__iexact=user.email)

        return Order.objects.filter(q, is_deleted=False).prefetch_related('items').distinct().order_by('-created_at')

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
            notes='Commande re├ºue et en attente de traitement.'
        )

        # Send confirmation email
        recipient_email = getattr(order, 'guest_email', None)
        if not recipient_email and order.user:
            recipient_email = order.user.email

        if recipient_email:
            def send_order_email(order_id, recipient):
                try:
                    # Need to re-fetch to get all relations in the thread
                    from .models import Order
                    o = Order.objects.prefetch_related('items').get(id=order_id)
                    subject = f"Confirmation de commande #{o.id} - Piov├® Cosmetics"
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

        # ÔöÇÔöÇ CIB / Edahabia via SATIM ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
        if order.payment_method == 'cib':
            from .satim_service import register_order
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


# ÔöÇÔöÇÔöÇ Admin Views ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

class ActivityLogMixin:
    def perform_create(self, serializer):
        instance = serializer.save()
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            model_name = instance.__class__._meta.verbose_name or instance.__class__.__name__
            from .models import UserActivityLog
            UserActivityLog.objects.create(
                user=self.request.user,
                action=f"Cr├®ation : {model_name} (ID: {instance.pk})",
                ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
            )

    def perform_update(self, serializer):
        instance = serializer.save()
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            model_name = instance.__class__._meta.verbose_name or instance.__class__.__name__
            from .models import UserActivityLog
            UserActivityLog.objects.create(
                user=self.request.user,
                action=f"Modification : {model_name} (ID: {instance.pk})",
                ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
            )

    def perform_destroy(self, instance):
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            model_name = instance.__class__._meta.verbose_name or instance.__class__.__name__
            from .models import UserActivityLog
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

        # ÔöÇÔöÇ Statuses that represent real revenue ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
        # COD: uniquement 'fulfilled' (livr├® + pay├® en main propre)
        # CIB/Edahabia: payment_status = 'paid' (callback SATIM confirm├®)
        REVENUE_Q = (
            Q(payment_method='cash', status='fulfilled', is_deleted=False) |
            Q(payment_method='cib', payment_status='paid', is_deleted=False)
        )

        total_orders   = Order.objects.filter(is_deleted=False).count()
        pending_orders = Order.objects.filter(status='pending', is_deleted=False).count()

        # Revenues ÔÇö only real confirmed/paid orders
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
        
        from .models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f"Mise ├á jour group├®e de {updated} produit(s)",
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT')
        )
        return Response({'message': f'{updated} produits mis ├á jour avec succ├¿s.', 'updated': updated})


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
                        
        from .models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f"R├®organisation des images de la galerie",
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT')
        )
        return Response({'message': 'Ordre mis ├á jour avec succ├¿s.'})

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
                return  # Commande invit├® ÔÇö pas de points
            # Refresh profile depuis la DB pour ├®viter donn├®es stale
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
                from .models import Coupon
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
    queryset = Order.objects.filter(is_deleted=False).select_related('user', 'customer').prefetch_related('items__product__images', 'items__variant').order_by('-created_at')
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
                notes=f"Statut modifi├® par un administrateur."
            )
            handle_loyalty_points(updated_instance, old_status, updated_instance.status)
            
            # --- EMAIL NOTIFICATION FOR CONFIRMED/CANCELLED ---
            if updated_instance.status in ['confirmed', 'cancelled']:
                recipient_email = getattr(updated_instance, 'guest_email', None)
                if not recipient_email and updated_instance.user:
                    recipient_email = updated_instance.user.email
                
                def send_status_email_task(order_id, recipient, status):
                    try:
                        from .models import Order
                        o = Order.objects.prefetch_related('items').get(id=order_id)
                        subject = f"Mise ├á jour de votre commande #{o.id} - Piov├® Cosmetics"
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
                        pass
                import threading
                threading.Thread(target=send_status_email_task, args=(updated_instance.id, recipient_email, updated_instance.status)).start()

            
            # --- MYLERZ AUTO-SHIP ---
            if updated_instance.status == 'confirmed' and not updated_instance.mylerz_barcode:
                from . import mylerz_service
                def async_mylerz_ship(order_id):
                    try:
                        from .models import Order, OrderStatusHistory
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
                                notes=f"Colis Mylerz g├®n├®r├® auto. Barcode: {o.mylerz_barcode}"
                            )
                        else:
                            msg = res.get('message', 'Erreur inconnue')
                            OrderStatusHistory.objects.create(
                                order=o,
                                status=o.status,
                                notes=f"├ëchec de cr├®ation du colis Mylerz : {msg}"
                            )
                    except Exception as e:
                        pass
                import threading
                threading.Thread(target=async_mylerz_ship, args=(updated_instance.id,)).start()

        from .models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f'Modification de la commande #{updated_instance.id} (Statut: {updated_instance.status})',
            ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
        )

    @action(detail=True, methods=['post'], url_path='edit_order')
    def edit_order(self, request, pk=None):
        """
        Admin endpoint to edit order details:
        - Customer: guest_name, guest_phone, guest_phone2, guest_email
        - Address: shipping_address, wilaya, city
        - Notes: notes
        - Items: [{id, quantity}] — set quantity=0 to remove
        """
        import logging
        logger = logging.getLogger(__name__)
        try:
            order = self.get_object()
            data = request.data

            # Update editable fields — only those that exist on the model
            model_field_names = {f.name for f in order._meta.get_fields() if hasattr(f, 'name')}
            editable_fields = [
                f for f in ['guest_name', 'guest_phone', 'guest_phone2', 'guest_email',
                             'shipping_address', 'wilaya', 'city', 'notes']
                if f in model_field_names
            ]
            changed = []
            for field in editable_fields:
                if field in data:
                    new_val = data[field]
                    if str(getattr(order, field) or '') != str(new_val or ''):
                        setattr(order, field, new_val or '')
                        changed.append(field)

            # Update items quantities
            items_data = data.get('items', [])
            for item_d in items_data:
                item_id = item_d.get('id')
                try:
                    qty = int(item_d.get('quantity', 1))
                except (TypeError, ValueError):
                    qty = 1
                if not item_id:
                    continue
                try:
                    from .models import OrderItem
                    item = order.items.get(id=item_id)
                    if qty <= 0:
                        item.delete()
                    else:
                        item.quantity = qty
                        item.save(update_fields=['quantity'])
                except Exception as e:
                    logger.warning(f'edit_order item {item_id} error: {e}')

            if changed:
                order.save(update_fields=changed)

            # Recalculate total after item changes
            if items_data:
                order.recalculate_total()

            try:
                UserActivityLog.objects.create(
                    user=request.user,
                    action=f'Modification manuelle commande #{order.id}: {", ".join(changed) if changed else "items"}',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT'),
                )
            except Exception as e:
                logger.warning(f'UAL create error: {e}')

            # Refresh to clear stale prefetch cache before serializing
            order.refresh_from_db()
            from .serializers import AdminOrderSerializer as Ser
            return Response(Ser(order, context={'request': request}).data)

        except Exception as e:
            import traceback
            logger.error(f'edit_order error: {traceback.format_exc()}')
            return Response({'detail': str(e)}, status=500)

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
            return Response({'error': 'Ce colis a d├®j├á un code-barres Mylerz.'}, status=400)
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
                notes=f"Colis Mylerz g├®n├®r├® manuellement. Barcode: {order.mylerz_barcode}"
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
                notes=f"Envoi Mylerz annul├®."
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
                return Response({'error': 'Credentials Mylerz non configur├®s sur le serveur (MYLERZ_USERNAME / MYLERZ_PASSWORD manquants dans le .env).'}, status=400)
            orders = Order.objects.filter(id__in=ids)
            results = []
            for order in orders:
                if order.mylerz_barcode:
                    results.append({'id': order.id, 'success': False, 'error': 'D├®j├á envoy├®', 'message': 'D├®j├á envoy├®'})
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
                        notes=f"Colis Mylerz g├®n├®r├® en masse. Barcode: {order.mylerz_barcode}"
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
                OrderStatusHistory.objects.create(order=order, status=order.status, notes="Envoi Mylerz annul├® (en masse).")
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
        return Response({'message': f'{updated_count} commande(s) supprim├®e(s).'})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = request.user
        instance.save()
        
        from .models import UserActivityLog
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
                    notes="Statut modifi├® en masse."
                )
                handle_loyalty_points(order, old_status, new_status)
                
                # --- MYLERZ AUTO-SHIP ---
                if new_status == 'confirmed' and not order.mylerz_barcode:
                    from . import mylerz_service
                    def async_mylerz_ship(order_id):
                        try:
                            from .models import Order, OrderStatusHistory
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
                                    notes=f"Colis Mylerz g├®n├®r├® auto (en masse). Barcode: {o.mylerz_barcode}"
                                )
                            else:
                                msg = res.get('message', 'Erreur inconnue')
                                OrderStatusHistory.objects.create(
                                    order=o,
                                    status=o.status,
                                    notes=f"├ëchec de cr├®ation du colis Mylerz : {msg}"
                                )
                        except Exception as e:
                            pass
                    import threading
                    threading.Thread(target=async_mylerz_ship, args=(order.id,)).start()
                
                updated_count += 1
                
        return Response({'message': f'{updated_count} commande(s) mise(s) ├á jour.'})

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
            customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invit├®')
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
            customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invit├®')
            phone = o.user.profile.phone if o.user and hasattr(o.user, 'profile') else o.guest_phone
            
            barcode_val = o.mylerz_barcode or f"CMD-{o.id}"
            barcode_url = f"https://barcode.tec-it.com/barcode.ashx?data={barcode_val}&code=Code128"
            
            # Payment text
            is_paid = o.payment_status == 'paid' or o.payment_method == 'cib'
            payment_text = "PAY├ë EN LIGNE" if is_paid else "MONTANT ├Ç ENCAISSER (C.O.D)"
            cod_amount = "0 DA" if is_paid else f"{float(o.total)} DA"
            cod_class = "cod-box paid" if is_paid else "cod-box"
            
            mylerz_label = "Mylerz Tracking" if o.mylerz_barcode else "Order Barcode"
            
            html += f"""
            <div class="label-container">
                <div class="header-row">
                    <div class="brand">PIOV├ë</div>
                    <div class="order-id">CMD #{o.id}</div>
                </div>
                
                <div class="barcode-box">
                    <img src="{barcode_url}" alt="Barcode" />
                    <div class="tracking-number">{barcode_val}</div>
                    <div style="font-size:10px; margin-top:2px;">{mylerz_label}</div>
                </div>
                
                <div class="info-grid">
                    <div class="info-box">
                        <h3>Exp├®diteur</h3>
                        <p><strong>PIOV├ë COSMETICS</strong></p>
                        <p>Alger, Alg├®rie</p>
                        <p>T├®l: 07 83 77 36 59</p>
                    </div>
                    <div class="info-box">
                        <h3>Destinataire</h3>
                        <p><strong>{customer}</strong></p>
                        <p>T├®l: <strong>{phone}</strong></p>
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
                    G├®n├®r├® le {o.created_at.strftime('%d/%m/%Y %H:%M')} | Piov├® Cosmetics
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
            return Response({'error': 'Aucun produit s├®lectionn├®.'}, status=status.HTTP_400_BAD_REQUEST)

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
            return Response({'error': 'Le num├®ro de t├®l├®phone est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

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
        from .models import Product as ProductModel, ProductVariant
        
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
            notes='Commande cr├®├®e manuellement par un administrateur.'
        )
        
        # 6. Send Email
        recipient_email = order.guest_email or (order.customer.email if order.customer else None)
        if recipient_email:
            def send_order_email(order_id, recipient):
                try:
                    from .models import Order
                    o = Order.objects.prefetch_related('items').get(id=order_id)
                    subject = f"Confirmation de commande #{o.id} - Piov├® Cosmetics"
                    text_content = render_to_string('emails/order_confirmation.txt', {'order': o})
                    html_content = render_to_string('emails/order_confirmation.html', {'order': o})
                    msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [recipient])
                    msg.attach_alternative(html_content, "text/html")
                    msg.send(fail_silently=True)
                except Exception:
                    pass
            threading.Thread(target=send_order_email, args=(order.id, recipient_email)).start()

        return Response(AdminOrderSerializer(order).data, status=status.HTTP_201_CREATED)


class AdminCouponViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Coupon.objects.all().order_by('-id')
    serializer_class = CouponSerializer

class AdminActivityLogView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from .models import UserActivityLog
        logs = UserActivityLog.objects.filter(user=request.user).order_by('-created_at')[:50]
        data = [{
            'id': l.id,
            'user_name': l.user.username,
            'action': l.action,
            'ip_address': l.ip_address,
            'user_agent': l.user_agent,
            'created_at': l.created_at
        } for l in logs]
        return Response(data)

class DeliveryCompanyViewSet(viewsets.ModelViewSet):
    queryset = DeliveryCompany.objects.all().order_by('name')
    serializer_class = DeliveryCompanySerializer
    pagination_class = None
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        from .models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f"Ajout d'un transporteur: {instance.name}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        from .models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f"Modification du transporteur: {instance.name}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
        )

    def perform_destroy(self, instance):
        from .models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f"Suppression du transporteur: {instance.name}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
        )
        instance.delete()


class DeliveryRateViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    queryset = DeliveryRate.objects.all().select_related('company')
    serializer_class = DeliveryRateSerializer
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['company', 'wilaya_name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'phone', 'email']
    filterset_fields = ['is_blacklisted', 'is_b2b']

    def get_queryset(self):
        from decimal import Decimal
        from django.db.models import Count, Sum, DecimalField, Q, Max
        from django.db.models.functions import Coalesce
        from django.utils import timezone
        from datetime import timedelta

        qs = Customer.objects.annotate(
            total_orders=Count('orders'),
            total_spent=Coalesce(Sum('orders__total'), Decimal('0.00'), output_field=DecimalField()),
            last_order_date=Max('orders__created_at'),
            cancelled_orders=Count('orders', filter=Q(orders__status='cancelled'))
        )

        segment = self.request.query_params.get('segment')
        if segment == 'high_spenders':
            qs = qs.filter(total_spent__gte=50000)
        elif segment == 'frequent_returners':
            qs = qs.filter(cancelled_orders__gte=3)
        elif segment == 'inactive_30d':
            thirty_days_ago = timezone.now() - timedelta(days=30)
            qs = qs.filter(Q(last_order_date__lt=thirty_days_ago) | Q(last_order_date__isnull=True))
        elif segment == 'blacklisted':
            qs = qs.filter(is_blacklisted=True)

        return qs.order_by('-created_at')

    @action(detail=True, methods=['get'])
    def customer_profile_details(self, request, pk=None):
        customer = self.get_object()
        orders = customer.orders.all().order_by('-created_at')
        
        # Extract unique addresses from orders
        addresses = set()
        for o in orders:
            if o.shipping_address:
                address_str = f"{o.shipping_address}, {o.wilaya}"
                addresses.add(address_str)

        from .serializers import AdminOrderSerializer
        orders_data = AdminOrderSerializer(orders, many=True).data

        return Response({
            'ltv': customer.total_spent,
            'total_orders': customer.total_orders,
            'saved_addresses': list(addresses),
            'order_history': orders_data
        })

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'Aucun ID fourni.'}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = Customer.objects.filter(id__in=ids).delete()
        return Response({'deleted': deleted})

    @action(detail=True, methods=['delete'])
    def delete_customer(self, request, pk=None):
        customer = self.get_object()
        customer.delete()
        return Response({'status': 'deleted'})


class AdminNewsletterSendView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from .models import NewsletterHistory
        history = NewsletterHistory.objects.all()[:100]  # Last 100
        data = [{'id': h.id, 'subject': h.subject, 'sent_count': h.sent_count, 'created_at': h.created_at.isoformat()} for h in history]
        return Response(data)

    def post(self, request):
        subject = request.data.get('subject')
        message_html = request.data.get('message')
        
        if not subject or not message_html:
            return Response({'error': 'Le sujet et le message sont requis.'}, status=status.HTTP_400_BAD_REQUEST)
            
        customers = Customer.objects.exclude(email='').exclude(email__isnull=True)
        emails = list(set([c.email for c in customers if c.email and '@' in c.email]))
        
        if not emails:
            return Response({'error': 'Aucun client avec une adresse email valide trouv├®.'}, status=status.HTTP_400_BAD_REQUEST)

        attachment = request.FILES.get('attachment')
        attachment_name, attachment_content, attachment_mimetype = None, None, None
        if attachment:
            attachment_name = attachment.name
            attachment_content = attachment.read()
            attachment_mimetype = attachment.content_type

        def send_newsletter(subject, html_content, recipient_list, att_name=None, att_content=None, att_mime=None):
            try:
                from django.template.loader import render_to_string
                rendered_html = render_to_string('emails/newsletter.html', {'message': html_content})
                
                msg = EmailMultiAlternatives(
                    subject=subject,
                    body="Veuillez utiliser un client email compatible HTML pour lire ce message.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    bcc=recipient_list
                )
                msg.attach_alternative(rendered_html, "text/html")
                
                if att_name and att_content and att_mime:
                    msg.attach(att_name, att_content, att_mime)
                    
                msg.send(fail_silently=True)
            except Exception as e:
                pass
                
        threading.Thread(target=send_newsletter, args=(subject, message_html, emails, attachment_name, attachment_content, attachment_mimetype)).start()
        
        from .models import NewsletterHistory
        NewsletterHistory.objects.create(subject=subject, message=message_html, sent_count=len(emails))

        return Response({'message': f'Newsletter envoy├®e ├á {len(emails)} clients avec succ├¿s.'})


class AdminNewsletterUploadImageView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'Aucune image fournie.'}, status=status.HTTP_400_BAD_REQUEST)
            
        import uuid
        from django.core.files.storage import default_storage
        ext = image.name.split('.')[-1]
        filename = f"newsletter/{uuid.uuid4().hex}.{ext}"
        saved_path = default_storage.save(filename, image)
        
        url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)
        return Response({'url': url})


class AdminReportView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        export = request.query_params.get('export')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        group_by = request.query_params.get('group_by', 'day') # day, week, month
        status_filter = request.query_params.get('status')

        qs = Order.objects.all()
        if status_filter:
            qs = qs.filter(status=status_filter)
        else:
            qs = qs.exclude(status='cancelled')

        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)

        if export:
            if export == 'json':
                full_orders = []
                for o in qs.order_by('-created_at'):
                    customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invit├®')
                    phone = o.user.profile.phone if o.user and hasattr(o.user, 'profile') else o.guest_phone
                    
                    items = []
                    for item in o.items.all():
                        items.append(f"{item.product_name} (x{item.quantity})")
                        
                    full_orders.append({
                        'ID': o.id,
                        'Date': o.created_at.strftime('%Y-%m-%d %H:%M'),
                        'Client': customer,
                        'T├®l├®phone': phone or '',
                        'Wilaya': getattr(o, 'wilaya', ''),
                        'Commune': getattr(o, 'city', ''),
                        'Adresse': getattr(o, 'shipping_address', ''),
                        'Statut': o.get_status_display(),
                        'Sous-total': float(sum(item.subtotal for item in o.items.all())),
                        'Livraison': float(o.delivery_cost),
                        'Remise': float(o.discount_amount),
                        'Total': float(o.total),
                        'Articles': " | ".join(items)
                    })
                return Response(full_orders)

            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="rapport_ventes.csv"'
            response.write(u'\ufeff'.encode('utf8')) # BOM for Excel
            writer = csv.writer(response)
            writer.writerow(['ID', 'Date', 'Client', 'Telephone', 'Wilaya', 'Statut', 'Total'])

            for o in qs.order_by('-created_at'):
                customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invit├®')
                phone = o.user.profile.phone if o.user and hasattr(o.user, 'profile') else o.guest_phone
                writer.writerow([
                    o.id,
                    o.created_at.strftime('%Y-%m-%d %H:%M'),
                    customer,
                    phone,
                    o.wilaya,
                    o.get_status_display(),
                    float(o.total)
                ])
            return response

        # Grouping
        if group_by == 'month':
            trunc = TruncMonth('created_at')
        elif group_by == 'week':
            trunc = TruncWeek('created_at')
        else:
            trunc = TruncDate('created_at')

        from django.db.models import Count, Sum, Q

        aggregated = (
            qs.annotate(period=trunc)
            .values('period')
            .annotate(
                revenue=Sum('total'), 
                orders_count=Count('id'),
                pending=Count('id', filter=Q(status='pending')),
                confirmed=Count('id', filter=Q(status='confirmed')),
                shipped=Count('id', filter=Q(status='shipped')),
                fulfilled=Count('id', filter=Q(status='fulfilled')),
                cancelled=Count('id', filter=Q(status='cancelled')),
                returned=Count('id', filter=Q(status='returned'))
            )
            .order_by('period')
        )

        chart_data = []
        for item in aggregated:
            if item['period']:
                chart_data.append({
                    'period': item['period'].strftime('%Y-%m-%d'),
                    'revenue': float(item['revenue'] or 0),
                    'orders_count': item['orders_count'],
                    'pending': item.get('pending', 0),
                    'confirmed': item.get('confirmed', 0),
                    'shipped': item.get('shipped', 0),
                    'fulfilled': item.get('fulfilled', 0),
                    'cancelled': item.get('cancelled', 0),
                    'returned': item.get('returned', 0),
                })

        orders_data = []
        for o in qs.order_by('-created_at')[:200]: # limit to 200 for table performance
            customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invit├®')
            orders_data.append({
                'id': o.id,
                'date': o.created_at.strftime('%Y-%m-%d %H:%M'),
                'customer': customer,
                'wilaya': o.wilaya,
                'status': o.status,
                'status_display': o.get_status_display(),
                'total': float(o.total)
            })

        annual_year = request.query_params.get('annual_year')
        from django.utils import timezone
        if not annual_year:
            annual_year = timezone.now().year
        else:
            annual_year = int(annual_year)

        from django.db.models import Count, Sum, Q
        from django.db.models.functions import ExtractMonth

        annual_qs = Order.objects.filter(created_at__year=annual_year)
        annual_stats = annual_qs.annotate(month=ExtractMonth('created_at')).values('month').annotate(
            total_orders=Count('id'),
            total_revenue=Sum('total'),
            pending=Count('id', filter=Q(status='pending')),
            confirmed=Count('id', filter=Q(status='confirmed')),
            shipped=Count('id', filter=Q(status='shipped')),
            fulfilled=Count('id', filter=Q(status='fulfilled')),
            cancelled=Count('id', filter=Q(status='cancelled')),
            returned=Count('id', filter=Q(status='returned'))
        )

        annual_data = []
        for i in range(1, 13):
            annual_data.append({
                'month': i,
                'total_orders': 0,
                'total_revenue': 0.0,
                'pending': 0,
                'confirmed': 0,
                'shipped': 0,
                'fulfilled': 0,
                'cancelled': 0,
                'returned': 0
            })

        for stat in annual_stats:
            m = stat['month'] - 1
            if 0 <= m < 12:
                annual_data[m]['total_orders'] = stat['total_orders']
                annual_data[m]['total_revenue'] = float(stat['total_revenue'] or 0)
                annual_data[m]['pending'] = stat['pending']
                annual_data[m]['confirmed'] = stat['confirmed']
                annual_data[m]['shipped'] = stat['shipped']
                annual_data[m]['fulfilled'] = stat['fulfilled']
                annual_data[m]['cancelled'] = stat['cancelled']
                annual_data[m]['returned'] = stat['returned']

        # Source stats (origin of orders)
        from django.db.models import Count, Sum, Q
        source_qs = Order.objects.all()
        if start_date:
            source_qs = source_qs.filter(created_at__date__gte=start_date)
        if end_date:
            source_qs = source_qs.filter(created_at__date__lte=end_date)

        source_stats_raw = (
            source_qs
            .values('source')
            .annotate(count=Count('id'), revenue=Sum('total'))
            .order_by('-count')
        )
        source_stats = []
        for s in source_stats_raw:
            label = s['source'] or 'direct'
            source_stats.append({
                'source': label,
                'count': s['count'],
                'revenue': float(s['revenue'] or 0),
            })

        return Response({
            'chart': chart_data,
            'orders': orders_data,
            'annual_summary': annual_data,
            'source_stats': source_stats,
        })

class SiteSettingsView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        from .models import SiteSettings
        settings = SiteSettings.load()
        return Response({
            'is_maintenance_mode': getattr(settings, 'is_maintenance_mode', False),
            'maintenance_message': getattr(settings, 'maintenance_message', ''),
            'free_shipping_threshold': float(getattr(settings, 'free_shipping_threshold', 5000)),
            'new_account_discount_enabled': getattr(settings, 'new_account_discount_enabled', False),
            'new_account_discount_percent': float(getattr(settings, 'new_account_discount_percent', 0)),
            'meta_pixel_id': getattr(settings, 'meta_pixel_id', '') or '',
            'tiktok_pixel_id': getattr(settings, 'tiktok_pixel_id', '') or '',
        })

class AdminSiteSettingsView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        from .models import SiteSettings
        settings = SiteSettings.load()
        return Response({
            'is_maintenance_mode': getattr(settings, 'is_maintenance_mode', False),
            'maintenance_message': getattr(settings, 'maintenance_message', ''),
            'free_shipping_threshold': float(getattr(settings, 'free_shipping_threshold', 5000)),
            'new_account_discount_enabled': getattr(settings, 'new_account_discount_enabled', False),
            'new_account_discount_percent': float(getattr(settings, 'new_account_discount_percent', 0)),
            'meta_pixel_id': getattr(settings, 'meta_pixel_id', '') or '',
            'tiktok_pixel_id': getattr(settings, 'tiktok_pixel_id', '') or '',
        })

    def post(self, request):
        from .models import SiteSettings
        settings = SiteSettings.load()
        
        if request.path.endswith('toggle_maintenance/'):
            settings.is_maintenance_mode = not settings.is_maintenance_mode
            settings.save()
            from .models import UserActivityLog
            action_text = "Activ├®" if settings.is_maintenance_mode else "D├®sactiv├®"
            UserActivityLog.objects.create(
                user=request.user,
                action=f"{action_text} le mode maintenance",
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
            )
            return Response({'is_maintenance_mode': settings.is_maintenance_mode})

        # General settings update
        changed = False
        msg = request.data.get('maintenance_message')
        if msg is not None:
            settings.maintenance_message = msg
            changed = True

        threshold = request.data.get('free_shipping_threshold')
        if threshold is not None:
            settings.free_shipping_threshold = threshold
            changed = True

        discount_enabled = request.data.get('new_account_discount_enabled')
        if discount_enabled is not None:
            settings.new_account_discount_enabled = bool(discount_enabled)
            changed = True

        discount_percent = request.data.get('new_account_discount_percent')
        if discount_percent is not None:
            settings.new_account_discount_percent = discount_percent
            changed = True

        pixel_id = request.data.get('meta_pixel_id')
        if pixel_id is not None:
            settings.meta_pixel_id = pixel_id.strip()
            changed = True

        tiktok_id = request.data.get('tiktok_pixel_id')
        if tiktok_id is not None:
            settings.tiktok_pixel_id = tiktok_id.strip()
            changed = True

        if changed:
            settings.save()
            return Response({'message': 'Param├¿tres mis ├á jour.'})

        return Response({'error': 'Requ├¬te invalide.'}, status=400)


class AdminB2BRequestViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(profile__is_b2b_pending=True).select_related('profile')

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        user = self.get_object()
        user.profile.is_b2b_pending = False
        user.profile.is_b2b = True
        user.profile.save()
        
        from .models import UserActivityLog
        UserActivityLog.objects.create(
            user=request.user,
            action=f"Validation du compte B2B de {user.email}",
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )
        return Response({'status': 'validated'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        user = self.get_object()
        user.profile.is_b2b_pending = False
        user.profile.save()
        
        from .models import UserActivityLog
        UserActivityLog.objects.create(
            user=request.user,
            action=f"Rejet du compte B2B de {user.email}",
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )
        return Response({'status': 'rejected'})

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['POST'])
@permission_classes([AllowAny])
def mylerz_webhook(request):
    """
    Webhook endpoint for Mylerz Algeria to push status updates.
    Expects a POST payload with Barcode and Status.
    """
    data = request.data
    # Handling both single object or list of objects
    if isinstance(data, dict):
        events = [data]
    elif isinstance(data, list):
        events = data
    else:
        return Response({'error': 'Invalid payload format'}, status=400)

    from pioveapp.management.commands.sync_mylerz import send_status_email
    
    updated = 0
    for event in events:
        barcode = event.get('Barcode') or event.get('barcode') or event.get('Package_Serial')
        status_text = event.get('Status') or event.get('status')
        
        if not barcode or not status_text:
            continue
            
        try:
            order = Order.objects.filter(mylerz_barcode=barcode).first()
            if not order and str(barcode).isdigit():
                order = Order.objects.filter(id=barcode).first()
                
            if order and order.mylerz_status != status_text:
                order.mylerz_status = status_text
                order.save(update_fields=['mylerz_status'])
                
                m_status_lower = status_text.lower()
                new_piove_status = None
                
                if m_status_lower in ['out for delivery', 'shuttling', 'forward delivery', 'dispatched']:
                    new_piove_status = 'shipped'
                elif m_status_lower in ['delivered', 'received by myler']:
                    new_piove_status = 'fulfilled'
                elif m_status_lower in ['returned', 'reverse delivery', 'returned to shipper']:
                    new_piove_status = 'returned'
                elif m_status_lower in ['cancelled']:
                    new_piove_status = 'cancelled'

                if new_piove_status and order.status != new_piove_status:
                    order.status = new_piove_status
                    order.save(update_fields=['status'])
                    
                    OrderStatusHistory.objects.create(
                        order=order,
                        status=new_piove_status,
                        notes=f"Statut Mylerz mis ├á jour via Webhook : {status_text}"
                    )
                    
                    send_status_email(order, new_piove_status, order.mylerz_barcode)
                    updated += 1
        except Exception as e:
            pass

    return Response({'success': True, 'updated': updated})


# ÔöÇÔöÇÔöÇ M├®diath├¿que ÔÇö scan du dossier media/ ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
import os, mimetypes
from django.core.files.storage import default_storage

class AdminMediaView(APIView):
    """
    GET  /api/admin/media/  ÔåÆ liste tous les fichiers dans MEDIA_ROOT
    POST /api/admin/media/  ÔåÆ upload un nouveau fichier
    DELETE /api/admin/media/?path=xxx ÔåÆ supprime un fichier
    """
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'}
    VIDEO_EXTS = {'.mp4', '.webm', '.mov', '.avi', '.mkv'}

    def get(self, request):
        media_root = settings.MEDIA_ROOT
        media_url  = settings.MEDIA_URL
        api_base = request.build_absolute_uri('/')[:-1]
        results = []
        if os.path.exists(media_root):
            for dirpath, _, filenames in os.walk(media_root):
                for fname in sorted(filenames):
                    ext = os.path.splitext(fname)[1].lower()
                    if ext not in self.IMAGE_EXTS and ext not in self.VIDEO_EXTS:
                        continue
                    full_path = os.path.join(dirpath, fname)
                    rel_path  = os.path.relpath(full_path, media_root).replace('\\', '/')
                    file_url  = f"{api_base}{media_url}{rel_path}"
                    try:
                        size = os.path.getsize(full_path)
                    except OSError:
                        size = 0
                    results.append({
                        'id': rel_path,
                        'name': fname,
                        'folder': os.path.dirname(rel_path) or '/',
                        'file': file_url,
                        'file_type': 'video' if ext in self.VIDEO_EXTS else 'image',
                        'size': size,
                        'rel_path': rel_path,
                    })
        results.sort(key=lambda x: x['folder'])
        return Response({'count': len(results), 'results': results})

    def post(self, request):
        """Upload a new file to media/uploads/"""
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'error': 'Aucun fichier fourni.'}, status=400)
        ext = os.path.splitext(uploaded.name)[1].lower()
        if ext not in self.IMAGE_EXTS and ext not in self.VIDEO_EXTS:
            return Response({'error': 'Type de fichier non support├®.'}, status=400)
        save_path = f"uploads/{uploaded.name}"
        saved = default_storage.save(save_path, uploaded)
        api_base = request.build_absolute_uri('/')[:-1]
        file_url = f"{api_base}{settings.MEDIA_URL}{saved}"
        return Response({
            'id': saved,
            'name': uploaded.name,
            'file': file_url,
            'file_type': 'video' if ext in self.VIDEO_EXTS else 'image',
        }, status=201)

    def delete(self, request):
        rel_path = request.query_params.get('path', '').strip('/')
        if not rel_path:
            return Response({'error': 'path requis'}, status=400)
        if '..' in rel_path:
            return Response({'error': 'Chemin invalide'}, status=400)
        full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
        if os.path.isfile(full_path):
            os.remove(full_path)
            return Response({'deleted': rel_path})
        return Response({'error': 'Fichier introuvable'}, status=404)


# ÔöÇÔöÇÔöÇ SATIM Payment Callback ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
from django.http import HttpResponseRedirect
from .satim_service import confirm_order

@api_view(['GET'])
@permission_classes([AllowAny])
def satim_callback(request):
    """Called by SATIM when the user returns from the payment page."""
    order_id_satim = request.GET.get('orderId')
    order_id_piove = request.GET.get('order_id')
    frontend_base  = getattr(settings, 'FRONTEND_URL', 'https://piovecosmetics.dz')

    def redirect_to(status, reason=None, msg=None):
        from urllib.parse import urlencode
        p = {'status': status}
        if order_id_piove: p['order_id'] = order_id_piove
        if reason:         p['reason']   = reason
        if msg:            p['msg']      = msg
        return HttpResponseRedirect(f"{frontend_base}/payment-result?{urlencode(p)}")

    if not order_id_satim or not order_id_piove:
        if order_id_piove:
            try:
                o = Order.objects.get(id=order_id_piove)
                if o.payment_status != 'paid':
                    o.status = 'cancelled'
                    o.save(update_fields=['status'])
            except Order.DoesNotExist:
                pass
        return redirect_to('cancelled', reason='missing_params')

    try:
        order = Order.objects.get(id=order_id_piove)
    except Order.DoesNotExist:
        return redirect_to('fail', reason='order_not_found')

    # If the order is already marked as paid (e.g. user refreshed the callback page), just return success
    if order.payment_status == 'paid':
        return redirect_to('success')

    confirm_res = confirm_order(order_id_satim)

    if confirm_res.get('success'):
        if order.payment_status != 'paid':
            order.payment_status = 'paid'
            order.status = 'confirmed'
            order.save(update_fields=['payment_status', 'status'])
            OrderStatusHistory.objects.create(
                order=order,
                status='confirmed',
                notes=f"Paiement CIB/Edahabia r├®ussi (ID transaction: {order_id_satim})."
            )
        return redirect_to('success')
    else:
        order.status = 'cancelled'
        order.save(update_fields=['status'])
        fail_msg = confirm_res.get('message', 'Paiement annul├® ou ├®chou├®.')
        OrderStatusHistory.objects.create(
            order=order,
            status='cancelled',
            notes=f"Paiement CIB/Edahabia annul├® : {fail_msg}"
        )
        return redirect_to('cancelled', reason='payment_failed', msg=fail_msg)


@api_view(['GET'])
@permission_classes([AllowAny])
def satim_test_view(request):
    """Diagnostic: test SATIM connectivity and credentials."""
    from .satim_service import test_satim_connection
    return Response(test_satim_connection())


class AdminProfileView(APIView):
    """GET / PUT admin user profile (first_name, last_name, email)."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        u = request.user
        return Response({
            'username': u.username,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
            'is_superuser': u.is_superuser,
            'groups': list(u.groups.values_list('name', flat=True)),
        })

    def put(self, request):
        u = request.user
        u.first_name = request.data.get('first_name', u.first_name)
        u.last_name  = request.data.get('last_name',  u.last_name)
        u.email      = request.data.get('email',      u.email)
        u.save()
        return Response({
            'username': u.username,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
        })


class AdminChangePasswordView(APIView):
    """POST {current_password, new_password} to change password."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        user = request.user
        current = request.data.get('current_password', '')
        new_pwd  = request.data.get('new_password', '')

        if not user.check_password(current):
            return Response({'detail': 'Mot de passe actuel incorrect.'}, status=400)
        if len(new_pwd) < 8:
            return Response({'detail': 'Le mot de passe doit contenir au moins 8 caract├¿res.'}, status=400)

        user.set_password(new_pwd)
        user.save()
        return Response({'detail': 'Mot de passe chang├® avec succ├¿s.'})



class AdminOrderHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Order.objects.all().select_related('user', 'customer', 'deleted_by').prefetch_related('items').order_by('-created_at')
    permission_classes = [IsAdminUser]
    serializer_class = AdminOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'payment_status', 'is_deleted', 'payment_method', 'customer__is_b2b']
    search_fields = ['guest_name', 'guest_phone', 'user__username', 'user__first_name', 'id']


# ─── Public Order Tracking ────────────────────────────────────────────────────

class TrackOrderView(APIView):
    """
    Public endpoint — no authentication required.
    GET /api/track/?q=<order_id|phone|email>

    Returns order status + Mylerz live tracking events.
    Reveals only safe public fields (status, items, wilaya, delivery, barcode).
    """
    permission_classes = []
    authentication_classes = []

    # Simple throttle: max 20 requests per minute per IP
    throttle_scope = 'track'

    STATUS_LABELS = {
        'pending':   'En attente de confirmation',
        'confirmed': 'Commande confirmée',
        'shipped':   'En cours de livraison',
        'fulfilled': 'Livrée',
        'cancelled': 'Annulée',
        'returned':  'Retournée',
    }

    def get(self, request):
        import re
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response({'detail': 'Veuillez entrer un numéro de commande, téléphone ou email.'}, status=400)

        # Build query: order id (digits only), phone or email
        from django.db.models import Q
        orders = Order.objects.filter(is_deleted=False).select_related('user', 'customer').prefetch_related('items')

        if re.match(r'^\d+$', q):
            # Could be order ID or phone number
            qs = orders.filter(
                Q(id=int(q)) |
                Q(guest_phone__icontains=q) |
                Q(customer__phone__icontains=q) |
                Q(user__profile__phone__icontains=q)
            )
        elif '@' in q:
            qs = orders.filter(
                Q(guest_email__iexact=q) |
                Q(user__email__iexact=q) |
                Q(customer__email__iexact=q)
            )
        else:
            # Phone number with formatting or prefix
            clean = re.sub(r'\D', '', q)
            qs = orders.filter(
                Q(guest_phone__icontains=clean) |
                Q(customer__phone__icontains=clean) |
                Q(user__profile__phone__icontains=clean)
            )

        qs = qs.order_by('-created_at')[:5]  # Return max 5 most recent

        if not qs.exists():
            return Response({'detail': 'Aucune commande trouvée avec ces informations.'}, status=404)

        results = []
        for order in qs:
            # Fetch live Mylerz tracking if barcode exists
            tracking_events = []
            mylerz_current_status = order.mylerz_status or ''

            if order.mylerz_barcode:
                try:
                    from .mylerz_service import track_shipment
                    track_result = track_shipment(order.mylerz_barcode)
                    if track_result.get('success'):
                        raw_events = track_result.get('tracking', [])
                        # Normalize events
                        for ev in raw_events:
                            tracking_events.append({
                                'date': ev.get('Date') or ev.get('date') or ev.get('EventDate', ''),
                                'status': ev.get('Status') or ev.get('status') or ev.get('EventStatus', ''),
                                'description': ev.get('Description') or ev.get('description') or ev.get('EventDescription', ''),
                                'location': ev.get('Location') or ev.get('location') or '',
                            })
                        # Update mylerz_status in DB with latest event
                        if tracking_events:
                            latest = tracking_events[0].get('status', '')
                            if latest and latest != order.mylerz_status:
                                order.mylerz_status = latest
                                order.save(update_fields=['mylerz_status'])
                            mylerz_current_status = latest
                except Exception as e:
                    logger.warning(f"TrackOrderView: Mylerz tracking failed for barcode {order.mylerz_barcode}: {e}")

            # Safe public fields only
            items_data = [
                {
                    'name': item.product_name,
                    'variant': item.variant_name,
                    'quantity': item.quantity,
                    'price': float(item.price_at_purchase),
                }
                for item in order.items.all()
            ]

            results.append({
                'id': order.id,
                'created_at': order.created_at.strftime('%d/%m/%Y à %H:%M'),
                'status': order.status,
                'status_label': self.STATUS_LABELS.get(order.status, order.status),
                'payment_method': order.get_payment_method_display(),
                'payment_status': order.payment_status,
                'wilaya': order.wilaya,
                'delivery_type': order.get_delivery_type_display(),
                'delivery_company': order.delivery_company_name,
                'total': float(order.total),
                'items': items_data,
                'mylerz_barcode': order.mylerz_barcode or None,
                'mylerz_status': mylerz_current_status or None,
                'tracking_events': tracking_events,
            })

        return Response({'orders': results})

