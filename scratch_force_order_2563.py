"""
Force re-insert order #2563 (delete existing + recreate)
Run: python scratch_force_order_2563.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')
django.setup()

from django.db import connection
from pioveapp.models import Order, OrderItem

# Delete existing #2563 if present
if Order.objects.filter(id=2563).exists():
    Order.objects.filter(id=2563).delete()
    print("[OK] Ancienne commande #2563 supprimee")

# Re-insert with correct data (from WooCommerce screenshot)
with connection.cursor() as cursor:
    cursor.execute("""
        INSERT INTO pioveapp_order (
            id, guest_name, guest_phone, guest_email,
            shipping_address, wilaya, city,
            delivery_company_name, delivery_type, delivery_cost,
            status, payment_status, payment_method,
            total, discount_amount, notes, source,
            is_viewed, created_at, updated_at,
            customer_id, user_id, coupon_id,
            mylerz_barcode, mylerz_pickup_code, mylerz_status
        ) VALUES (
            2563, 'Nesrine Sammour', '0779972049', '',
            'Birkhadem djenan sfari', 'Alger', 'Birkhadem',
            '', 'home', 0,
            'confirmed', 'unpaid', 'cash',
            4980.00, 0, '', 'fb',
            0, '2026-07-13 14:05:00', '2026-07-13 14:05:00',
            NULL, NULL, NULL,
            '', '', ''
        )
    """)

order = Order.objects.get(id=2563)
OrderItem.objects.create(
    order=order,
    product=None,
    product_name="The beauty box",
    variant_name="",
    quantity=1,
    price_at_purchase=4980.00,
)

print("[OK] Commande #2563 creee -- Nesrine Sammour -- 4980 DA -- source: fb")
print("[OK] Article: The beauty box x1")
