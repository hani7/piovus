import os
import django
import csv
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')
django.setup()

from pioveapp.models import Product, ProductVariant

csv_path = r'C:\Users\PC\Downloads\wc-product-export-28-5-2026-1779955774915.csv'

# 1. Map WooCommerce ID to Parent Product
wc_id_to_parent = {}

# We need to collect all colors from the parents
color_map = {} # mapping (parent_name, variant_short_name) -> color_hex

with open(csv_path, newline='', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        is_parent = not row.get('Parent', '').strip()
        if is_parent:
            wc_id = row.get('ID', '').strip()
            name = row.get('Nom', '').strip()
            if not wc_id or not name:
                continue
            
            wc_id_to_parent[wc_id] = name
            
            swatches_str = row.get('Swatches Attributes', '').strip()
            if swatches_str:
                try:
                    swatches = json.loads(swatches_str)
                    for attr_key, attr_data in swatches.items():
                        if attr_data.get('type') == 'color':
                            terms = attr_data.get('terms', {})
                            for term_key, term_data in terms.items():
                                term_name = term_data.get('name', '').strip()
                                color_hex = term_data.get('color', '').strip()
                                if term_name and color_hex:
                                    color_map[(name, term_name)] = color_hex
                except Exception as e:
                    print(f"Error parsing swatches for {name}: {e}")

variants = ProductVariant.objects.all()
updated = 0

for variant in variants:
    parent_name = variant.product.name
    variant_name = variant.name
    
    # Try exact match
    color = color_map.get((parent_name, variant_name))
    
    # If not found, try case-insensitive or partial match
    if not color:
        for (p_name, v_name), c_hex in color_map.items():
            if p_name.lower() == parent_name.lower() and v_name.lower() == variant_name.lower():
                color = c_hex
                break
    
    if color:
        variant.color_hex = color
        variant.save(update_fields=['color_hex'])
        updated += 1
        print(f"Updated {parent_name} - {variant_name} to {color}")
    else:
        print(f"Color not found for {parent_name} - {variant_name}")

print(f"Successfully updated {updated} variants with color codes.")
