from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from decimal import Decimal


class SiteSettings(models.Model):
    is_maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(default="Nous serons de retour très bientôt.")
    # Free shipping
    free_shipping_threshold = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Montant minimum pour bénéficier de la livraison gratuite (0 = désactivé)"
    )
    # New account discount
    new_account_discount_enabled = models.BooleanField(default=False)
    new_account_discount_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=10,
        help_text="Pourcentage de remise offert lors de la création d'un compte"
    )
    # Meta Pixel
    meta_pixel_id = models.CharField(
        max_length=50, blank=True, default='',
        help_text="ID du pixel Meta (Facebook) — ex: 2139405799887149"
    )

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class NewsletterHistory(models.Model):
    subject = models.CharField(max_length=255)
    message = models.TextField()
    sent_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subject} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class UserActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['order', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    categories = models.ManyToManyField(Category, related_name='multi_products', blank=True)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True, max_length=250)
    description = models.TextField(blank=True)
    short_description = models.CharField(max_length=300, blank=True, help_text="Courte description affichée sous la contenance sur la page produit")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    promo_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    b2b_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True) # Legacy
    b2b_price_box = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    b2b_promo_price_box = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    b2b_price_carton = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    b2b_promo_price_carton = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    units_per_carton = models.PositiveIntegerField(default=1)
    weight_box = models.DecimalField(max_digits=6, decimal_places=2, default=0.00, help_text="Poids par boîte (kg)")
    weight_carton = models.DecimalField(max_digits=6, decimal_places=2, default=0.00, help_text="Poids par carton (kg)")
    contenance = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Contenance du produit (ex: 5.3)")
    contenance_unit = models.CharField(max_length=20, blank=True, default='g', help_text="Unité de contenance (g, ml, oz...)")
    b2b_min_stock = models.PositiveIntegerField(default=1, help_text="Quantité minimale de commande (MOQ) pour B2B")
    stock = models.PositiveIntegerField(default=0)
    min_stock_alert = models.PositiveIntegerField(default=5)
    is_featured = models.BooleanField(default=False)
    is_new = models.BooleanField(default=False)
    is_bestseller = models.BooleanField(default=False)
    is_promotion = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    related_products = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='related_to')
    thumbnail = models.ImageField(upload_to='products/thumbnails/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def is_promo(self):
        return self.promo_price is not None and self.promo_price < self.price

    @property
    def effective_price(self):
        return self.promo_price if self.is_promo else self.price

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/images/', blank=True, null=True)
    video = models.FileField(upload_to='products/videos/', blank=True, null=True)
    alt = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.product.name} — image {self.order}"


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=100)   # e.g. shade name
    color_hex = models.CharField(max_length=255, blank=True)  # can hold hex or image URL
    image = models.ImageField(upload_to='products/variants/', blank=True, null=True)
    stock = models.PositiveIntegerField(default=0)
    sku = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Prix spécifique à cette variation (laissez vide pour utiliser le prix du produit)")
    is_available = models.BooleanField(default=True, help_text="Disponibilité de cette variation")

    def __str__(self):
        return f"{self.product.name} — {self.name}"


class Banner(models.Model):
    PLACEMENT_CHOICES = [
        ('hero', 'Hero Slider (Accueil)'),
        ('popup', 'Pop-up d\'entrée'),
        ('home_section_1', 'Bandeau Section 1 (Accueil)'),
        ('home_section_2', 'Bandeau Section 2 (Accueil)'),
        ('top_banner', 'Bandeau Supérieur (Global)'),
        ('category_banner', 'Bandeau Page Catégorie'),
        ('side_left', 'Bannière Flottante Gauche'),
        ('side_right', 'Bannière Flottante Droite'),
    ]
    title = models.CharField(max_length=200, blank=True, null=True)
    subtitle = models.CharField(max_length=300, blank=True)
    image = models.ImageField(upload_to='banners/')
    cta_label = models.CharField(max_length=100, default='Découvrir')
    cta_url = models.CharField(max_length=200, default='/shop')
    promo_code = models.CharField(max_length=50, blank=True)
    placement = models.CharField(max_length=50, choices=PLACEMENT_CHOICES, default='hero')
    category = models.ForeignKey('Category', on_delete=models.CASCADE, null=True, blank=True, related_name='banners')
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    wilaya = models.CharField(max_length=100, blank=True)
    is_b2b = models.BooleanField(default=False)
    # Nouveaux champs B2B
    company_name = models.CharField(max_length=200, blank=True)
    nrc = models.CharField(max_length=100, blank=True, verbose_name="Registre de Commerce")
    nif = models.CharField(max_length=100, blank=True, verbose_name="Numéro d'Identification Fiscale")
    nrc_file = models.FileField(upload_to='b2b_docs/', blank=True, null=True, verbose_name="Document NRC")
    is_b2b_pending = models.BooleanField(default=False)
    loyalty_points = models.PositiveIntegerField(default=0, help_text="Points de fidélité (1 point = 1 DA)")

    def __str__(self):
        return f"Profile — {self.user.username}"


class DeliveryCompany(models.Model):
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Delivery Companies'
        ordering = ['name']

    def __str__(self):
        return self.name


class DeliveryRate(models.Model):
    company = models.ForeignKey(DeliveryCompany, on_delete=models.CASCADE, related_name='rates')
    wilaya_name = models.CharField(max_length=100)
    price_home = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    price_desk = models.DecimalField(max_digits=10, decimal_places=2, default=300.00)
    b2b_price_home = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    b2b_price_desk = models.DecimalField(max_digits=10, decimal_places=2, default=300.00)

    class Meta:
        unique_together = ('company', 'wilaya_name')
        ordering = ['wilaya_name']

    def __str__(self):
        return f"{self.company.name} - {self.wilaya_name}"


class Customer(models.Model):
    name = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=True)
    is_blacklisted = models.BooleanField(default=False)
    is_b2b = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name or 'Inconnu'} - {self.phone}"


class Coupon(models.Model):
    DISCOUNT_TYPES = [
        ('percentage', 'Pourcentage (%)'),
        ('fixed', 'Montant fixe (DA)'),
        ('bogo', 'Achetez X, Obtenez Y (BOGO)'),
    ]
    code = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='coupons', null=True, blank=True, help_text="Si défini, seul cet utilisateur peut utiliser le coupon.")
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES, default='percentage')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # BOGO settings
    buy_quantity = models.PositiveIntegerField(null=True, blank=True)
    get_quantity = models.PositiveIntegerField(null=True, blank=True)
    
    # Constraints
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    times_used = models.PositiveIntegerField(default=0)
    
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.code

    def is_valid(self):
        from django.utils import timezone
        if not self.is_active:
            return False
        if self.usage_limit and self.times_used >= self.usage_limit:
            return False
        now = timezone.now()
        if self.start_date and now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        return True


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('confirmed', 'Confirmé'),
        ('shipped', 'En livraison'),
        ('fulfilled', 'Fulfilled'),
        ('cancelled', 'Annulée'),
        ('returned', 'Retournée'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    # Guest fields (for guest checkout)
    guest_name = models.CharField(max_length=200, blank=True)
    guest_phone = models.CharField(max_length=20, blank=True)
    guest_email = models.EmailField(blank=True)

    # Shipping
    shipping_address = models.TextField(blank=True)
    wilaya = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    delivery_company_name = models.CharField(max_length=100, blank=True)
    delivery_type = models.CharField(max_length=20, choices=[('home', 'À domicile'), ('desk', 'Bureau / Point relais')], default='home')
    delivery_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Order info
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=[('unpaid', 'Non payé'), ('paid', 'Payé'), ('refunded', 'Remboursé')], default='unpaid')

    # Mylerz integration
    mylerz_barcode = models.CharField(max_length=100, blank=True, verbose_name='Code-barres Mylerz')
    mylerz_pickup_code = models.CharField(max_length=100, blank=True, verbose_name='Code de collecte Mylerz')
    mylerz_status = models.CharField(max_length=200, blank=True, verbose_name='Statut Mylerz')
    payment_method = models.CharField(max_length=20, choices=[('cash', 'Paiement à la livraison'), ('cib', 'CIB ou Edahabia')], default='cash')
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    is_viewed = models.BooleanField(default=False)
    
    # Coupon fields
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        name = self.user.get_full_name() if self.user else self.guest_name
        return f"Commande #{self.pk} — {name}"

    def recalculate_total(self):
        subtotal = sum(item.subtotal for item in self.items.all())
        # We assume discount_amount is calculated during checkout and saved.
        # Ensure total is not negative
        self.total = max(Decimal('0'), subtotal - self.discount_amount)
        self.save(update_fields=['total'])


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField(max_length=200)   # snapshot
    variant_name = models.CharField(max_length=100, blank=True)  # snapshot
    quantity = models.PositiveIntegerField(default=1)
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def subtotal(self):
        return self.price_at_purchase * self.quantity

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"


class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    rating = models.PositiveSmallIntegerField(default=5)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Avis sur {self.product.name} par {self.user.username}"


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='history')
    status = models.CharField(max_length=20, choices=Order.STATUS_CHOICES)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order} -> {self.get_status_display()} le {self.created_at}"
