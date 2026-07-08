import csv
import sqlite3

csv_path = r"C:\Users\PC\Downloads\wc-product-export-fixed.csv"
db_path = r"C:\Users\PC\Documents\piove\db (4).sqlite3"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Load Django products: name -> id
cursor.execute("SELECT id, name FROM pioveapp_product")
django_products = {}
for pid, name in cursor.fetchall():
    django_products[name.strip().lower()] = pid

# 2. Load Django variants: product_id -> set of variant names (lowercase)
cursor.execute("SELECT product_id, sku, name FROM pioveapp_productvariant")
django_variants = {}
for pid, sku, name in cursor.fetchall():
    if pid not in django_variants:
        django_variants[pid] = set()
    django_variants[pid].add(sku.strip().lower() if sku else '')
    django_variants[pid].add(name.strip().lower())

# 3. Parse CSV Parent mapping (WooCommerce ID -> Product Name)
csv_parent_map = {}
with open(csv_path, encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row.get('Type') in ('variable', 'simple'):
            csv_parent_map[row.get('ID')] = row.get('Nom', row.get('Name', '')).strip().lower()

missing_variants = []
total_csv_variants = 0

with open(csv_path, encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row.get('Type') == 'variation':
            total_csv_variants += 1
            full_variant_name = row.get('Nom', row.get('Name', ''))
            
            # The parent name is everything before " - "
            if ' - ' in full_variant_name:
                parent_name_raw = full_variant_name.rsplit(' - ', 1)[0].strip()
                variant_name_raw = full_variant_name.rsplit(' - ', 1)[1].strip()
            else:
                continue # Can't infer parent name
                
            parent_name_lower = parent_name_raw.lower()
            django_product_id = django_products.get(parent_name_lower)
            
            if django_product_id:
                existing_vars = django_variants.get(django_product_id, set())
                if variant_name_raw.lower() not in existing_vars:
                    # Insert this variant!
                    image_url = row.get('Images', '')
                    price = row.get('Tarif promo', '') or row.get('Tarif rgulier', '') or 200.0
                    
                    cursor.execute("SELECT MAX(id) FROM pioveapp_productvariant")
                    max_id = (cursor.fetchone()[0] or 0) + 1
                    
                    cursor.execute("""
                        INSERT INTO pioveapp_productvariant 
                        (id, product_id, name, color_hex, is_available, price, image, stock, sku) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        max_id, 
                        django_product_id, 
                        variant_name_raw, 
                        image_url, 
                        1, 
                        float(price),
                        image_url,
                        10,
                        variant_name_raw
                    ))
                    
                    missing_variants.append(variant_name_raw)

conn.commit()
conn.close()
print(f"Successfully inserted {len(missing_variants)} missing variants into db (4).sqlite3!")
