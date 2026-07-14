import csv
import sqlite3

csv_path = r"C:\Users\PC\Downloads\wc-product-export-fixed.csv"
db_path = r"C:\Users\PC\Downloads\db (6).sqlite3"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

updated_price = 0
updated_image = 0
not_found_variants = 0

with open(csv_path, encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row.get('Type') == 'variation':
            name = row.get('Nom', row.get('Name', ''))
            variant_name = name.split('-')[-1].strip() if '-' in name else name
            
            image_url = row.get('Images', '')
            # Trying different possible column names for price
            price = row.get('Tarif promo') or row.get('Tarif régulier') or row.get('Tarif rgulier')
            if not price:
                price = row.get('Tarif promo', '') or row.get('Tarif rgulier', '')
            
            if not price and not image_url:
                continue

            cursor.execute("SELECT id, price, image FROM pioveapp_productvariant WHERE name = ?", (variant_name,))
            db_variants = cursor.fetchall()
            
            if not db_variants:
                not_found_variants += 1
                continue

            for db_v in db_variants:
                v_id, v_price, v_image = db_v
                
                if price and (v_price is None or float(v_price) == 0):
                    try:
                        cursor.execute("UPDATE pioveapp_productvariant SET price = ? WHERE id = ?", (float(price), v_id))
                        updated_price += 1
                    except ValueError:
                        pass
                
                if image_url and (not v_image or v_image == ''):
                    cursor.execute("UPDATE pioveapp_productvariant SET image = ? WHERE id = ?", (image_url, v_id))
                    updated_image += 1

conn.commit()
conn.close()
print(f"Updated price for {updated_price} variants")
print(f"Updated image for {updated_image} variants")
print(f"Could not find match for {not_found_variants} variants in CSV")
