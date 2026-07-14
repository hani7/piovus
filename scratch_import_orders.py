"""
Import orders from WooCommerce CSV export + reset next order ID to 2567
Run: python manage.py shell < scratch_import_orders.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')
django.setup()

from django.db import connection
from pioveapp.models import Order, OrderItem, Customer

# ── Orders to import ────────────────────────────────────────────────────────
ORDERS = [
    {
        "id": 2563,
        "guest_name": "Nesrine Sammour",
        "guest_phone": "0779972049",
        "guest_email": "",
        "shipping_address": "Birkhadem djenan sfari",
        "wilaya": "Alger",
        "city": "Birkhadem",
        "delivery_type": "home",
        "delivery_cost": 0,
        "status": "confirmed",
        "payment_status": "unpaid",
        "payment_method": "cash",
        "total": 4980.00,
        "notes": "",
        "created_at": "2026-07-13 14:05:53",
        "items": [
            {"product_name": "The beauty box", "variant_name": "", "quantity": 1, "price_at_purchase": 4980.00},
        ]
    },
    {
        "id": 2564,
        "guest_name": "Nadia Berrouane",
        "guest_phone": "+213561248106",
        "guest_email": "",
        "shipping_address": "Hussein dey",
        "wilaya": "Alger",
        "city": "Hussein Dey",
        "delivery_type": "home",
        "delivery_cost": 0,
        "status": "confirmed",
        "payment_status": "unpaid",
        "payment_method": "cash",
        "total": 6360.00,
        "notes": "",
        "created_at": "2026-07-13 15:43:36",
        "items": [
            {"product_name": "Body Mists - Body Mist Romance", "variant_name": "body-mist-romance", "quantity": 1, "price_at_purchase": 650.00},
            {"product_name": "Nail Polish Remover 250ml - Rose pivoine", "variant_name": "rose-pivoine", "quantity": 1, "price_at_purchase": 480.00},
            {"product_name": "Revital Base Nail Polish", "variant_name": "", "quantity": 1, "price_at_purchase": 380.00},
            {"product_name": "Pure Lipstick - PUL04 Rose framboise", "variant_name": "PUL04", "quantity": 1, "price_at_purchase": 790.00},
            {"product_name": "Bellissimo Lipstick - BEL19", "variant_name": "BEL19", "quantity": 1, "price_at_purchase": 720.00},
            {"product_name": "Pure Lipstick - PUL07 Rose peche", "variant_name": "PUL07", "quantity": 1, "price_at_purchase": 790.00},
            {"product_name": "Body Mists - Body Mist Dreamy", "variant_name": "body-mist-dreamy", "quantity": 1, "price_at_purchase": 650.00},
            {"product_name": "Eau Micellaire", "variant_name": "", "quantity": 1, "price_at_purchase": 320.00},
            {"product_name": "Bellissimo Lipstick Ultra Pigment - BEL21 Rouge agate", "variant_name": "BEL21", "quantity": 1, "price_at_purchase": 790.00},
            {"product_name": "Pure Lipstick - PUL03 Rouge agathe", "variant_name": "PUL03", "quantity": 1, "price_at_purchase": 790.00},
        ]
    },
    {
        "id": 2565,
        "guest_name": "Faiz Nr",
        "guest_phone": "+213773342153",
        "guest_email": "",
        "shipping_address": "Hydra",
        "wilaya": "Alger",
        "city": "Hydra",
        "delivery_type": "home",
        "delivery_cost": 0,
        "status": "confirmed",
        "payment_status": "unpaid",
        "payment_method": "cash",
        "total": 4980.00,
        "notes": "",
        "created_at": "2026-07-13 23:18:09",
        "items": [
            {"product_name": "The beauty box", "variant_name": "", "quantity": 1, "price_at_purchase": 4980.00},
        ]
    },
    {
        "id": 2566,
        "guest_name": "Benkara Karima",
        "guest_phone": "0672648266",
        "guest_email": "",
        "shipping_address": "Constantine",
        "wilaya": "Constantine",
        "city": "Constantine",
        "delivery_type": "home",
        "delivery_cost": 0,
        "status": "confirmed",
        "payment_status": "unpaid",
        "payment_method": "cash",
        "total": 1980.00,
        "notes": "Bien satisfaite",
        "created_at": "2026-07-14 08:05:46",
        "items": [
            {"product_name": "Bronzing Loose Powder - BL02 Orange sablé", "variant_name": "BL02", "quantity": 1, "price_at_purchase": 300.00},
            {"product_name": "Perfetto Black Tattoo Liner", "variant_name": "", "quantity": 1, "price_at_purchase": 290.00},
            {"product_name": "Perfetto matte lipstick - PM218", "variant_name": "PM218", "quantity": 1, "price_at_purchase": 500.00},
            {"product_name": "Nail Polish Remover 70ml - Rose pivoine", "variant_name": "rose-pivoine", "quantity": 1, "price_at_purchase": 240.00},
            {"product_name": "Mini Crystal Colors Nail Polish - MC20 Rose cerise", "variant_name": "MC20", "quantity": 2, "price_at_purchase": 150.00},
            {"product_name": "Highlighter Loose Powder - HL03 Precious glow", "variant_name": "HL03", "quantity": 1, "price_at_purchase": 350.00},
        ]
    },
]

imported = 0
skipped = 0

for data in ORDERS:
    order_id = data["id"]

    # Skip if already exists
    if Order.objects.filter(id=order_id).exists():
        print(f"  [SKIP] Commande #{order_id} existe deja")
        skipped += 1
        continue

    # Create order with specific ID using raw SQL to force the ID
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO pioveapp_order (
                id, guest_name, guest_phone, guest_email,
                shipping_address, wilaya, city,
                delivery_company_name, delivery_type, delivery_cost,
                status, payment_status, payment_method,
                total, discount_amount, notes,
                is_viewed, created_at, updated_at,
                customer_id, user_id, coupon_id,
                mylerz_barcode, mylerz_pickup_code, mylerz_status
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s,
                '', %s, %s,
                %s, %s, %s,
                %s, 0, %s,
                0, %s, %s,
                NULL, NULL, NULL,
                '', '', ''
            )
        """, [
            order_id,
            data["guest_name"], data["guest_phone"], data["guest_email"],
            data["shipping_address"], data["wilaya"], data["city"],
            data["delivery_type"], data["delivery_cost"],
            data["status"], data["payment_status"], data["payment_method"],
            data["total"], data["notes"],
            data["created_at"], data["created_at"],
        ])

    # Create items
    order = Order.objects.get(id=order_id)
    for item in data["items"]:
        OrderItem.objects.create(
            order=order,
            product=None,
            product_name=item["product_name"],
            variant_name=item["variant_name"],
            quantity=item["quantity"],
            price_at_purchase=item["price_at_purchase"],
        )

    print(f"  [OK] Commande #{order_id} importee -- {data['guest_name']} -- {data['total']} DA -- {len(data['items'])} article(s)")
    imported += 1


# ── Reset next ID to 2567 ────────────────────────────────────────────────────
with connection.cursor() as cursor:
    # For SQLite: update sqlite_sequence
    cursor.execute(
        "UPDATE sqlite_sequence SET seq = 2566 WHERE name = 'pioveapp_order'"
    )
    rows = cursor.rowcount
    if rows == 0:
        # If row doesn't exist yet, insert it
        cursor.execute(
            "INSERT INTO sqlite_sequence (name, seq) VALUES ('pioveapp_order', 2566)"
        )

print(f"\n{'='*50}")
print(f"[OK] Import termine: {imported} importees, {skipped} ignorees")
print(f"[OK] Prochain numero de commande: 2567")
print(f"{'='*50}")
