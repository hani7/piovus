import csv
import sqlite3

csv_path = r"C:\Users\PC\Downloads\wc-product-export-fixed.csv"
db_path = r"C:\Users\PC\Documents\piove\db (4).sqlite3"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get the max ID from the table to insert new ones
cursor.execute("SELECT MAX(id) FROM pioveapp_productvariant")
max_id = cursor.fetchone()[0] or 0

inserted = 0

with open(csv_path, encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row.get('Nom', row.get('Name', ''))
        
        if row.get('Type') == 'variation' and 'Full Colors Nail' in name:
            max_id += 1
            
            # Extract the actual variant name, e.g. "FC201 Transparent" from "Full Colors Nail polish - FC201 Transparent"
            variant_name = name.split('-')[-1].strip() if '-' in name else name
            
            image_url = row.get('Images', '')
            price = row.get('Tarif promo', '') or row.get('Tarif rgulier', '')
            if not price:
                price = 200.00
            
            cursor.execute("""
                INSERT INTO pioveapp_productvariant 
                (id, product_id, name, color_hex, is_available, price, image, stock, sku) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                max_id, 
                330, 
                variant_name, 
                image_url, 
                1, 
                float(price),
                image_url,
                10,
                variant_name
            ))
            inserted += 1

conn.commit()
conn.close()
print(f"Successfully inserted {inserted} variants for Full Colors Nail Polish!")
