import csv
import sqlite3

csv_path = r"C:\Users\PC\Downloads\wc-product-export-fixed.csv"
db_path = r"C:\Users\PC\Documents\piove\db.sqlite3"

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
            parent_id = row.get('Parent')
            if parent_id in csv_parent_map:
                parent_name_lower = csv_parent_map[parent_id]
                # Find product_id in Django DB
                django_product_id = django_products.get(parent_name_lower)
                
                if django_product_id:
                    full_variant_name = row.get('Nom', row.get('Name', ''))
                    # Usually WooCommerce variant names are "Parent Name - Variant"
                    variant_name = full_variant_name.split('-')[-1].strip() if '-' in full_variant_name else full_variant_name
                    
                    # Check if this variant exists in Django
                    existing_vars = django_variants.get(django_product_id, set())
                    if variant_name.lower() not in existing_vars:
                        missing_variants.append({
                            'django_product_id': django_product_id,
                            'parent_name': parent_name_lower,
                            'variant_name': variant_name,
                            'image': row.get('Images', ''),
                            'price': row.get('Tarif promo', '') or row.get('Tarif rgulier', '') or 200.0
                        })
                else:
                    print(f"WARNING: Parent product '{parent_name_lower}' not found in Django DB.")

print(f"Total variants in CSV: {total_csv_variants}")
print(f"Total MISSING variants in Django DB: {len(missing_variants)}")

# Print a summary of missing variants per product
missing_summary = {}
for mv in missing_variants:
    missing_summary[mv['parent_name']] = missing_summary.get(mv['parent_name'], 0) + 1

for name, count in missing_summary.items():
    print(f"- {name.title()}: {count} missing variants")
