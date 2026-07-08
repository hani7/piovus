import csv

csv_path = r"C:\Users\PC\Downloads\wc-product-export-fixed.csv"
with open(csv_path, encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    print('Columns:', reader.fieldnames)
    
    # We want to find variants for "Full Colors Nail polish"
    for row in reader:
        name = row.get('Nom', row.get('Name', ''))
        parent = row.get('Parent', '')
        
        # In WooCommerce exports, variants often have Type='variation' and Parent starts with the parent SKU or ID.
        if 'Full Colors Nail' in name or 'Full Color Nail' in name:
            print(f"ID: {row.get('ID')}, Type: {row.get('Type')}, Name: {name}, Parent: {parent}")
