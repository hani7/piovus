import csv
import sqlite3
import re

csv_path = r"C:\Users\PC\Downloads\wc-product-export-fixed.csv"
db_path  = r"C:\Users\PC\Documents\piove\db (4).sqlite3"

def clean_html(text):
    """Remove HTML tags and normalize whitespace."""
    text = re.sub(r'<[^>]+>', '', text)
    text = text.replace('\\n', ' ').replace('\n', ' ').replace('\r', '')
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_contenance(short_desc):
    """
    Try to extract a numeric contenance (volume/weight) from the start of the
    short description.  Examples: '12ml', '30 ml', '10g', '3.5g', '250ml'.
    Returns (value_float, unit_str) or (None, None).
    """
    m = re.match(r'^(\d+(?:[.,]\d+)?)\s*(ml|g|L|cl)\b', short_desc, re.IGNORECASE)
    if m:
        val  = float(m.group(1).replace(',', '.'))
        unit = m.group(2).lower()
        return val, unit
    return None, None

# ── 1. Load CSV products (simple + variable only) ──────────────────────────
csv_products = {}   # name -> {short_description, contenance, unit}

with open(csv_path, encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row.get('Type') not in ('simple', 'variable'):
            continue

        name  = row.get('Nom', '').strip()
        short = clean_html(row.get('Description courte', ''))

        val, unit = extract_contenance(short)

        csv_products[name] = {
            'short_description': short[:299],   # field is varchar(300)
            'contenance':        val,
            'contenance_unit':   unit or '',
        }

print(f"CSV products loaded: {len(csv_products)}")

# ── 2. Update the database ─────────────────────────────────────────────────
conn   = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, name, short_description, contenance, contenance_unit FROM pioveapp_product")
db_products = cursor.fetchall()

updated = 0
skipped = 0
no_match = 0

for (pid, db_name, db_short, db_cont, db_unit) in db_products:

    if db_name in csv_products:
        data = csv_products[db_name]
        new_short = data['short_description']
        new_cont  = data['contenance']
        new_unit  = data['contenance_unit']

        # Only update if the field is actually empty/None
        update_short = (not db_short) and new_short
        update_cont  = (db_cont is None) and (new_cont is not None)
        update_unit  = (not db_unit) and new_unit

        if update_short or update_cont or update_unit:
            # Build partial UPDATE to avoid overwriting existing data
            set_parts = []
            params    = []
            if update_short:
                set_parts.append("short_description = ?")
                params.append(new_short)
            if update_cont:
                set_parts.append("contenance = ?")
                params.append(new_cont)
            if update_unit:
                set_parts.append("contenance_unit = ?")
                params.append(new_unit)

            params.append(pid)
            cursor.execute(
                f"UPDATE pioveapp_product SET {', '.join(set_parts)} WHERE id = ?",
                params
            )
            updated += 1
            print(f"  UPDATED id={pid} '{db_name[:40]}' "
                  f"| short={'YES' if update_short else '-'} "
                  f"| cont={'YES' if update_cont else '-'} ({new_cont} {new_unit})")
        else:
            skipped += 1
    else:
        no_match += 1
        print(f"  NO_MATCH id={pid} '{db_name}'")

conn.commit()
conn.close()

print()
print(f"Done. Updated: {updated} | Already filled: {skipped} | No CSV match: {no_match}")
