from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Category, Product, ProductImage, ProductVariant,
    Banner, Order, OrderItem, Review, UserProfile,
    DeliveryCompany, DeliveryRate, Customer, OrderStatusHistory, Coupon
)


# ─── Coupons ─────────────────────────────────────────────────────────────────
class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'


# ─── Category ────────────────────────────────────────────────────────────────
class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'image', 'order', 'product_count']

    def get_product_count(self, obj):
        return obj.multi_products.filter(is_active=True).count()


# ─── Product Images & Variants ───────────────────────────────────────────────
class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'video', 'alt', 'order']


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'name', 'color_hex', 'image', 'stock', 'sku', 'price', 'is_available']


# ─── Review ──────────────────────────────────────────────────────────────────
class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'username', 'rating', 'comment', 'created_at']
        read_only_fields = ['created_at']

    def get_username(self, obj):
        return obj.user.get_full_name() or obj.user.username if obj.user else 'Anonyme'


# ─── Product (list - compact) ─────────────────────────────────────────────────
class ProductListSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True, read_only=True)
    is_promo = serializers.BooleanField(read_only=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    avg_rating = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'categories',
            'price', 'promo_price', 'b2b_price', 'b2b_price_box', 'b2b_price_carton', 'b2b_promo_price_box', 'b2b_promo_price_carton', 'effective_price', 'is_promo',
            'units_per_carton', 'b2b_min_stock', 'stock', 'is_featured', 'is_new', 'is_bestseller', 'is_promotion', 'thumbnail',
            'weight_box', 'weight_carton', 'contenance', 'contenance_unit', 'short_description',
            'avg_rating', 'created_at',
        ]

    def get_avg_rating(self, obj):
        reviews = obj.reviews.all()
        if not reviews:
            return None
        return round(sum(r.rating for r in reviews) / len(reviews), 1)


# ─── Product (detail - full) ──────────────────────────────────────────────────
class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    review_count = serializers.SerializerMethodField()
    related_products = ProductListSerializer(many=True, read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            'description', 'images', 'variants', 'reviews', 'review_count', 'updated_at', 'related_products'
        ]

    def get_review_count(self, obj):
        return obj.reviews.count()


# ─── Banner ──────────────────────────────────────────────────────────────────
class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = ['id', 'title', 'subtitle', 'image', 'cta_label', 'cta_url', 'promo_code', 'placement', 'category', 'is_active', 'order']


# ─── Auth / User ─────────────────────────────────────────────────────────────
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone', 'address', 'wilaya', 'is_b2b', 'company_name', 'nrc', 'nif', 'nrc_file', 'is_b2b_pending', 'loyalty_points']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()
    coupons = CouponSerializer(many=True, read_only=True)
    groups = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'profile', 'coupons', 'groups']
        read_only_fields = ['is_staff', 'is_superuser', 'coupons', 'groups']

    def get_groups(self, obj):
        return list(obj.groups.values_list('name', flat=True))

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if profile_data is not None:
            profile = getattr(instance, 'profile', None)
            if profile:
                for attr, value in profile_data.items():
                    setattr(profile, attr, value)
                profile.save()
                
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2', 'phone']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Les mots de passe ne correspondent pas.'})
        return data

    def create(self, validated_data):
        phone = validated_data.pop('phone', '')
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user, phone=phone)
        return user


class B2BRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True, required=True)
    company_name = serializers.CharField(write_only=True, required=True)
    nrc = serializers.CharField(write_only=True, required=True)
    nif = serializers.CharField(write_only=True, required=True)
    nrc_file = serializers.FileField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2', 'phone', 'company_name', 'nrc', 'nif', 'nrc_file']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Les mots de passe ne correspondent pas.'})
        return data

    def create(self, validated_data):
        phone = validated_data.pop('phone')
        company_name = validated_data.pop('company_name')
        nrc = validated_data.pop('nrc')
        nif = validated_data.pop('nif')
        nrc_file = validated_data.pop('nrc_file', None)
        validated_data.pop('password2')
        
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(
            user=user, 
            phone=phone,
            company_name=company_name,
            nrc=nrc,
            nif=nif,
            nrc_file=nrc_file,
            is_b2b=False,
            is_b2b_pending=True
        )
        return user


# ─── Order ───────────────────────────────────────────────────────────────────
class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.SerializerMethodField()
    variant_color = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'variant', 'product_name', 'variant_name', 'variant_color',
            'quantity', 'price_at_purchase', 'subtotal', 'product_image'
        ]
        
    def get_product_image(self, obj):
        from django.conf import settings
        url = None
        if obj.variant and obj.variant.image:
            url = obj.variant.image.url
        elif obj.product:
            first_image = obj.product.images.first()
            if first_image and first_image.image:
                url = first_image.image.url

        if not url:
            return None

        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(url)

        # Fallback: build absolute URL using API_URL setting
        api_base = getattr(settings, 'API_URL', '').rstrip('/')
        if api_base and url.startswith('/'):
            return f"{api_base}{url}"
        return url

    def get_variant_color(self, obj):
        if obj.variant and obj.variant.color_hex:
            return obj.variant.color_hex
        return None


class OrderItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, default=1)


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    class Meta:
        model = OrderStatusHistory
        fields = ['id', 'status', 'status_display', 'notes', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    history = OrderStatusHistorySerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    shipping_address = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'guest_name', 'guest_phone', 'guest_email',
            'shipping_address', 'wilaya', 'city',
            'delivery_company_name', 'delivery_type', 'delivery_cost',
            'status', 'status_display', 'payment_method', 'total', 'notes',
            'items', 'history', 'created_at',
            'mylerz_barcode', 'mylerz_pickup_code', 'mylerz_status'
        ]
        read_only_fields = ['user', 'status', 'total', 'created_at', 'delivery_cost', 'delivery_company_name', 'history', 'mylerz_barcode', 'mylerz_pickup_code', 'mylerz_status']


class OrderCreateSerializer(serializers.Serializer):
    # Guest or user checkout
    guest_name = serializers.CharField(required=False, allow_blank=True)
    guest_phone = serializers.CharField(required=False, allow_blank=True)
    guest_email = serializers.EmailField(required=False, allow_blank=True)
    shipping_address = serializers.CharField(required=False, allow_blank=True)
    wilaya = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=['cash', 'cib'], default='cash')
    delivery_company_id = serializers.IntegerField(required=False, allow_null=True)
    delivery_type = serializers.ChoiceField(choices=['home', 'desk'], default='home')
    
    coupon_id = serializers.IntegerField(required=False, allow_null=True)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    source = serializers.CharField(required=False, allow_blank=True)
    
    items = OrderItemCreateSerializer(many=True)


# ─── Admin Serializers ────────────────────────────────────────────────────────

class AdminCategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'image', 'order', 'is_active', 'product_count']
        read_only_fields = ['slug']

    def get_product_count(self, obj):
        return obj.multi_products.count()


class AdminProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'product', 'name', 'color_hex', 'image', 'stock', 'sku', 'price', 'is_available']


class AdminProductImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = ProductImage
        fields = ['id', 'product', 'image', 'video', 'alt', 'order']


class AdminProductSerializer(serializers.ModelSerializer):
    categories = AdminCategorySerializer(many=True, read_only=True)
    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), many=True, source='categories', required=False
    )
    is_promo = serializers.BooleanField(read_only=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    variants = AdminProductVariantSerializer(many=True, read_only=True)
    images = AdminProductImageSerializer(many=True, read_only=True)
    related_products = ProductListSerializer(many=True, read_only=True)
    related_product_ids = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), many=True, source='related_products', required=False
    )

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'categories', 'category_ids',
            'description', 'short_description', 'price', 'promo_price', 'b2b_price', 'b2b_price_box', 'b2b_price_carton', 'b2b_promo_price_box', 'b2b_promo_price_carton', 'effective_price', 'is_promo',
            'units_per_carton', 'b2b_min_stock', 'stock', 'min_stock_alert', 'is_featured', 'is_new', 'is_bestseller', 'is_promotion', 'is_active',
            'thumbnail', 'weight_box', 'weight_carton', 'contenance', 'contenance_unit', 'created_at', 'updated_at', 'variants', 'images', 'related_products', 'related_product_ids'
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at']



class AdminBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = ['id', 'title', 'subtitle', 'image', 'cta_label', 'cta_url', 'promo_code', 'placement', 'category', 'is_active', 'order']
class AdminOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    history = OrderStatusHistorySerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    customer_name = serializers.SerializerMethodField()
    is_blacklisted = serializers.SerializerMethodField()
    source = serializers.SerializerMethodField()
    deleted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'customer_name', 'user', 'guest_name', 'guest_phone', 'guest_phone2', 'guest_email',
            'shipping_address', 'wilaya', 'city',
            'delivery_company_name', 'delivery_type', 'delivery_cost',
            'status', 'status_display', 'payment_status', 'payment_method', 'total', 'notes', 'source',
            'items', 'history', 'created_at', 'updated_at', 'is_blacklisted', 'customer',
            'mylerz_barcode', 'mylerz_pickup_code', 'mylerz_status',
            'is_deleted', 'deleted_at', 'deleted_by_name'
        ]
        read_only_fields = ['user', 'total', 'created_at', 'updated_at', 'items', 'history', 'delivery_cost', 'delivery_company_name', 'is_blacklisted', 'mylerz_barcode', 'mylerz_pickup_code', 'mylerz_status', 'is_deleted', 'deleted_at', 'deleted_by_name']

    def get_customer_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return obj.guest_name or 'Client anonyme'

    def get_is_blacklisted(self, obj):
        if obj.customer:
            return obj.customer.is_blacklisted
        return False

    def get_deleted_by_name(self, obj):
        if obj.deleted_by:
            return obj.deleted_by.get_full_name() or obj.deleted_by.username
        return None

    def get_source(self, obj):
        # Safe fallback in case column doesn't exist on production DB yet
        return getattr(obj, 'source', '') or ''


class AdminOrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status']


class AdminOrderEditSerializer(serializers.ModelSerializer):
    """Full editable fields for admin order edit panel."""
    class Meta:
        model = Order
        fields = [
            'status',
            'guest_name', 'guest_phone', 'guest_phone2', 'guest_email',
            'shipping_address', 'wilaya', 'city',
            'notes',
        ]
        extra_kwargs = {f: {'required': False} for f in [
            'status', 'guest_name', 'guest_phone', 'guest_phone2', 'guest_email',
            'shipping_address', 'wilaya', 'city', 'notes',
        ]}


# ─── Delivery Serializers ────────────────────────────────────────────────────
class DeliveryRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryRate
        fields = ['id', 'company', 'wilaya_name', 'price_home', 'price_desk', 'b2b_price_home', 'b2b_price_desk']


class DeliveryCompanySerializer(serializers.ModelSerializer):
    rates = DeliveryRateSerializer(many=True, read_only=True)

    class Meta:
        model = DeliveryCompany
        fields = ['id', 'name', 'is_active', 'rates']


class CustomerSerializer(serializers.ModelSerializer):
    total_orders = serializers.IntegerField(read_only=True)
    total_spent = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', 'is_blacklisted', 'is_b2b', 'total_orders', 'total_spent', 'created_at', 'updated_at']
