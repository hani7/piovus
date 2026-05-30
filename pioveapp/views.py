from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
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
    AdminBannerSerializer, AdminOrderSerializer, AdminOrderStatusSerializer,
    DeliveryCompanySerializer, DeliveryRateSerializer, CustomerSerializer, CouponSerializer
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
    ordering = ['-is_featured', '-created_at']
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

    @action(detail=True, methods=['get'])
    def related(self, request, slug=None):
        product = self.get_object()
        qs = self.get_queryset().none()
        
        if product.category:
            qs = self.get_queryset().filter(category=product.category).exclude(id=product.id)[:5]
            
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


# ─── Banners ──────────────────────────────────────────────────────────────────
class BannerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Banner.objects.filter(is_active=True)
    serializer_class = BannerSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['placement']


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
            'message': 'Compte B2B créé avec succès. En attente de validation.'
        }, status=status.HTTP_201_CREATED)


from django.core.cache import cache

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            if hasattr(user, 'profile') and user.profile.is_b2b_pending:
                return Response({'error': 'Votre compte B2B est en cours de validation par nos équipes. Vous serez notifié par email une fois validé.'}, status=status.HTTP_403_FORBIDDEN)

            # if user.is_staff or user.is_superuser:
            #     otp = get_random_string(6, allowed_chars='0123456789')
            #     cache.set(f'mfa_otp_{user.id}', otp, timeout=300) # 5 mins
            #     
            #     try:
            #         from django.core.mail import send_mail
            #         send_mail(
            #             'Code de sécurité Piove',
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
            return Response({'error': 'Code invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)
            
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
                    action='Déconnexion',
                    ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
                )
                
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            pass
        return Response({'message': 'Déconnecté avec succès.'})


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
            return Response({'error': 'Erreur lors de la vérification'}, status=status.HTTP_400_BAD_REQUEST)

        email = profile.get('email')
        if not email:
            return Response({'error': 'Email requis (vérifiez vos permissions Facebook)'}, status=status.HTTP_400_BAD_REQUEST)
            
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
            return Response({'error': 'Le mot de passe doit contenir au moins 6 caractères.'}, status=status.HTTP_400_BAD_REQUEST)

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

        return Response({'message': 'Mot de passe modifié avec succès.'})



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
                    from .models import Order
                    o = Order.objects.prefetch_related('items').get(id=order_id)
                    subject = f"Confirmation de commande #{o.id} - Piové Cosmetics"
                    text_content = render_to_string('emails/order_confirmation.txt', {'order': o})
                    html_content = render_to_string('emails/order_confirmation.html', {'order': o})
                    
                    msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [recipient])
                    msg.attach_alternative(html_content, "text/html")
                    msg.send(fail_silently=True)
                except Exception as e:
                    pass
            
            threading.Thread(target=send_order_email, args=(order.id, recipient_email)).start()

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


# ─── Admin Views ──────────────────────────────────────────────────────────────

class ActivityLogMixin:
    def perform_create(self, serializer):
        instance = serializer.save()
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            model_name = instance.__class__._meta.verbose_name or instance.__class__.__name__
            from .models import UserActivityLog
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
        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status='pending').count()
        
        # Revenues
        total_revenue = Order.objects.exclude(status='cancelled').aggregate(rev=Sum('total'))['rev'] or 0
        
        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_revenue = Order.objects.filter(created_at__gte=today).exclude(status='cancelled').aggregate(rev=Sum('total'))['rev'] or 0
        
        seven_days_ago = timezone.now() - timedelta(days=6)
        seven_days_ago_start = seven_days_ago.replace(hour=0, minute=0, second=0, microsecond=0)
        weekly_revenue = Order.objects.filter(created_at__gte=seven_days_ago_start).exclude(status='cancelled').aggregate(rev=Sum('total'))['rev'] or 0

        # AOV & Conversion Rate
        average_order_value = float(total_revenue) / total_orders if total_orders > 0 else 0
        total_customers = Customer.objects.count()
        conversion_rate = (total_orders / total_customers * 100) if total_customers > 0 else 0

        total_products = Product.objects.count()
        active_products = Product.objects.filter(is_active=True).count()
        total_categories = Category.objects.count()

        recent_orders = Order.objects.select_related('user', 'customer').prefetch_related('items').order_by('-created_at')[:10]
        recent_serialized = AdminOrderSerializer(recent_orders, many=True).data

        # Urgent Alerts
        out_of_stock_products = Product.objects.filter(stock__lte=0).values('id', 'name', 'stock')[:10]
        out_of_stock_variants = ProductVariant.objects.filter(stock__lte=0).select_related('product')[:10]
        out_of_stock_list = list(out_of_stock_products) + [{'id': v.product.id, 'name': f"{v.product.name} ({v.name})", 'stock': v.stock} for v in out_of_stock_variants]
        
        fraud_orders = Order.objects.filter(status='pending', customer__is_blacklisted=True).order_by('-created_at')[:10]
        fraud_serialized = AdminOrderSerializer(fraud_orders, many=True).data

        # Orders per status
        status_counts = {
            s: Order.objects.filter(status=s).count()
            for s, _ in Order.STATUS_CHOICES
        }

        # 7-day trends
        recent_trend_orders = Order.objects.filter(created_at__gte=seven_days_ago_start)
        
        trends = []
        for i in range(7):
            d = (seven_days_ago_start + timedelta(days=i)).date()
            day_orders = recent_trend_orders.filter(created_at__date=d)
            trends.append({
                'date': d.strftime('%Y-%m-%d'),
                'revenue': float(day_orders.exclude(status='cancelled').aggregate(r=Sum('total'))['r'] or 0),
                'orders': day_orders.count()
            })

        return Response({
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'total_revenue': float(total_revenue),
            'daily_revenue': float(daily_revenue),
            'weekly_revenue': float(weekly_revenue),
            'average_order_value': float(average_order_value),
            'conversion_rate': float(conversion_rate),
            'total_products': total_products,
            'active_products': active_products,
            'total_categories': total_categories,
            'status_counts': status_counts,
            'recent_orders': recent_serialized,
            'urgent_alerts': {
                'out_of_stock': out_of_stock_list[:10],
                'fraud_orders': fraud_serialized,
            },
            'trends': trends,
            'total_customers': total_customers,
        })


class AdminProductViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    queryset = Product.objects.all().select_related('category').order_by('-created_at')
    serializer_class = AdminProductSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['category', 'is_active', 'is_featured', 'is_new']
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
                        
        from .models import UserActivityLog
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
    queryset = Banner.objects.all().order_by('order')
    serializer_class = AdminBannerSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class AdminOrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().select_related('user', 'customer').prefetch_related('items').order_by('-created_at')
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
            
        from .models import UserActivityLog
        UserActivityLog.objects.create(
            user=self.request.user,
            action=f'Modification de la commande #{updated_instance.id} (Statut: {updated_instance.status})',
            ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT')
        )

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
        deleted_count, _ = Order.objects.filter(id__in=ids).delete()
        return Response({'message': f'{deleted_count} commande(s) supprimée(s).'})

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
                order.status = new_status
                order.save(update_fields=['status'])
                OrderStatusHistory.objects.create(
                    order=order,
                    status=new_status,
                    notes="Statut modifié en masse."
                )
                updated_count += 1
                
        return Response({'message': f'{updated_count} commande(s) mise(s) à jour.'})

    @action(detail=False, methods=['post'])
    def bulk_export_csv(self, request):
        ids = request.data.get('ids', [])
        qs = Order.objects.filter(id__in=ids).order_by('-created_at') if ids else self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="commandes_export.csv"'
        response.write(u'\ufeff'.encode('utf8')) # BOM for Excel
        writer = csv.writer(response)
        writer.writerow(['ID', 'Date', 'Client', 'Telephone', 'Wilaya', 'Livraison', 'Statut', 'Paiement', 'Total'])

        for o in qs:
            customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invité')
            phone = o.user.profile.phone if o.user and hasattr(o.user, 'profile') else o.guest_phone
            writer.writerow([
                o.id,
                o.created_at.strftime('%Y-%m-%d %H:%M'),
                customer,
                phone,
                o.wilaya,
                o.get_delivery_type_display(),
                o.get_status_display(),
                o.get_payment_status_display(),
                float(o.total)
            ])
        return response

    @action(detail=False, methods=['post'])
    def bulk_packing_slips(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'Aucun ID fourni.'}, status=status.HTTP_400_BAD_REQUEST)
        
        orders = Order.objects.filter(id__in=ids).select_related('user').prefetch_related('items')
        
        # Simple HTML rendering for printing
        html = """
        <html>
        <head>
            <style>
                body { font-family: sans-serif; font-size: 14px; }
                .slip { page-break-after: always; padding: 40px; }
                .slip:last-child { page-break-after: auto; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            </style>
        </head>
        <body onload="window.print()">
        """
        for o in orders:
            customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invité')
            phone = o.user.profile.phone if o.user and hasattr(o.user, 'profile') else o.guest_phone
            
            html += f"""
            <div class="slip">
                <div class="header">
                    <div>
                        <h2>PIOVÉ COSMETICS</h2>
                        <p>Bon de livraison #{o.id}</p>
                    </div>
                    <div>
                        <h3>Destinataire</h3>
                        <p>{customer}<br>Tél: {phone}<br>{o.shipping_address}<br>{o.wilaya}</p>
                    </div>
                </div>
                <p><strong>Date de commande:</strong> {o.created_at.strftime('%Y-%m-%d %H:%M')}</p>
                <p><strong>Méthode de livraison:</strong> {o.get_delivery_type_display()}</p>
                
                <table>
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th>Quantité</th>
                            <th>Prix unitaire</th>
                            <th>Sous-total</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            for item in o.items.all():
                html += f"""
                        <tr>
                            <td>{item.product_name}</td>
                            <td>{item.quantity}</td>
                            <td>{item.price} DA</td>
                            <td>{item.subtotal} DA</td>
                        </tr>
                """
            html += f"""
                    </tbody>
                </table>
                <p style="text-align: right; margin-top: 20px; font-size: 16px;"><strong>Total à payer: {o.total} DA</strong></p>
                <p style="text-align: right; margin-top: 5px;"><strong>Statut paiement: {o.get_payment_status_display()}</strong></p>
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
            notes='Commande créée manuellement par un administrateur.'
        )
        
        # 6. Send Email
        recipient_email = order.guest_email or (order.customer.email if order.customer else None)
        if recipient_email:
            def send_order_email(order_id, recipient):
                try:
                    from .models import Order
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


class AdminNewsletterSendView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        subject = request.data.get('subject')
        message_html = request.data.get('message')
        
        if not subject or not message_html:
            return Response({'error': 'Le sujet et le message sont requis.'}, status=status.HTTP_400_BAD_REQUEST)
            
        customers = Customer.objects.exclude(email='').exclude(email__isnull=True)
        emails = list(set([c.email for c in customers if c.email and '@' in c.email]))
        
        if not emails:
            return Response({'error': 'Aucun client avec une adresse email valide trouvé.'}, status=status.HTTP_400_BAD_REQUEST)

        def send_newsletter(subject, html_content, recipient_list):
            try:
                msg = EmailMultiAlternatives(
                    subject=subject,
                    body="Veuillez utiliser un client email compatible HTML pour lire ce message.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    bcc=recipient_list
                )
                msg.attach_alternative(html_content, "text/html")
                msg.send(fail_silently=True)
            except Exception as e:
                pass
                
        threading.Thread(target=send_newsletter, args=(subject, message_html, emails)).start()
        
        return Response({'message': f'Newsletter envoyée à {len(emails)} clients avec succès.'})


class AdminReportView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        export = request.query_params.get('export', 'false').lower() == 'true'
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
            if request.query_params.get('export') == 'json':
                full_orders = []
                for o in qs.order_by('-created_at'):
                    customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invité')
                    phone = o.user.profile.phone if o.user and hasattr(o.user, 'profile') else o.guest_phone
                    
                    items = []
                    for item in o.items.all():
                        items.append(f"{item.product_name} (x{item.quantity})")
                        
                    full_orders.append({
                        'ID': o.id,
                        'Date': o.created_at.strftime('%Y-%m-%d %H:%M'),
                        'Client': customer,
                        'Téléphone': phone or '',
                        'Wilaya': o.wilaya or '',
                        'Commune': o.commune or '',
                        'Adresse': o.address or '',
                        'Statut': o.get_status_display(),
                        'Sous-total': float(o.subtotal),
                        'Livraison': float(o.delivery_cost),
                        'Remise': float(o.discount),
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
                customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invité')
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
            customer = o.user.get_full_name() or o.user.username if o.user else (o.guest_name or 'Invité')
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

        return Response({
            'chart': chart_data,
            'orders': orders_data,
            'annual_summary': annual_data
        })

class SiteSettingsView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        from .models import SiteSettings
        settings = SiteSettings.load()
        return Response({
            'is_maintenance_mode': settings.is_maintenance_mode,
            'maintenance_message': settings.maintenance_message
        })

class AdminSiteSettingsView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        from .models import SiteSettings
        settings = SiteSettings.load()
        return Response({
            'is_maintenance_mode': settings.is_maintenance_mode,
            'maintenance_message': settings.maintenance_message
        })

    def post(self, request):
        from .models import SiteSettings
        settings = SiteSettings.load()
        
        # simple toggle
        if request.path.endswith('toggle_maintenance/'):
            settings.is_maintenance_mode = not settings.is_maintenance_mode
            settings.save()
            
            from .models import UserActivityLog
            action_text = "Activé" if settings.is_maintenance_mode else "Désactivé"
            UserActivityLog.objects.create(
                user=request.user,
                action=f"{action_text} le mode maintenance",
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
            )
            return Response({'is_maintenance_mode': settings.is_maintenance_mode})
            
        msg = request.data.get('maintenance_message')
        if msg is not None:
            settings.maintenance_message = msg
            settings.save()
            return Response({'message': 'Paramètres mis à jour.'})
            
        return Response({'error': 'Requête invalide.'}, status=400)


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
