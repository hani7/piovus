from django.contrib import admin
from .models import (
    Category, Product, ProductImage, ProductVariant,
    Banner, Order, OrderItem, Review, UserProfile
)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'order', 'is_active', 'product_count']
    list_editable = ['order', 'is_active']
    prepopulated_fields = {'slug': ('name',)}

    def product_count(self, obj):
        return obj.multi_products.filter(is_active=True).count()
    product_count.short_description = 'Produits'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'get_categories', 'price', 'promo_price', 'stock', 'is_featured', 'is_new', 'is_active']
    list_editable = ['price', 'promo_price', 'stock', 'is_featured', 'is_new', 'is_active']
    list_filter = ['categories', 'is_featured', 'is_new', 'is_active']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductImageInline, ProductVariantInline]

    def get_categories(self, obj):
        return ", ".join([c.name for c in obj.categories.all()])
    get_categories.short_description = 'Catégories'


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ['title', 'cta_label', 'cta_url', 'is_active', 'order']
    list_editable = ['is_active', 'order']


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product_name', 'variant_name', 'price_at_purchase', 'subtotal']

    def subtotal(self, obj):
        return obj.subtotal
    subtotal.short_description = 'Sous-total'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_name', 'get_phone', 'wilaya', 'city', 'status', 'total', 'created_at']
    list_filter = ['status', 'wilaya', 'created_at']
    list_editable = ['status']
    search_fields = ['guest_name', 'guest_phone', 'user__username']
    inlines = [OrderItemInline]
    readonly_fields = ['total', 'created_at']

    def get_name(self, obj):
        return obj.user.get_full_name() if obj.user else obj.guest_name
    get_name.short_description = 'Client'

    def get_phone(self, obj):
        return obj.user.profile.phone if obj.user and hasattr(obj.user, 'profile') else obj.guest_phone
    get_phone.short_description = 'Téléphone'


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['product', 'user', 'rating', 'created_at']
    list_filter = ['rating']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone', 'wilaya']


admin.site.site_header = 'Piové Cosmetics — Administration'
admin.site.site_title = 'Piové Admin'
admin.site.index_title = 'Tableau de bord'
