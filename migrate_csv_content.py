import csv, sqlite3, re, sys, os

CSV_PATH = r"C:\Users\PC\Downloads\wc-product-export-fixed.csv"
DB_PATHS = [
    r"C:\Users\PC\Documents\piove\db.sqlite3",
    r"C:\Users\PC\Documents\piove\db (4).sqlite3",
]
DRY_RUN = "--dry-run" in sys.argv


def clean_html(text):
    text = re.sub(r'<[^>]+>', '', text or '')
    return re.sub(r'\s+', ' ', text.replace('\\n', ' ')).strip()


def extract_contenance(s):
    m = re.match(r'^(\d+(?:[.,]\d+)?)\s*(ml|g|L|cl|oz|kg)\b', s.strip(), re.IGNORECASE)
    if m:
        return float(m.group(1).replace(',', '.')), m.group(2).lower()
    return None, None


# 1. Load CSV
csv_data = {}
with open(CSV_PATH, encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        if row.get('Type') not in ('simple', 'variable'):
            continue
        name  = row.get('Nom', '').strip()
        short = clean_html(row.get('Description courte', ''))
        val, unit = extract_contenance(short)
        csv_data[name] = {
            'short_description': short[:299],
            'contenance':        val,
            'contenance_unit':   unit or '',
        }

print(f"CSV: {len(csv_data)} produits charges")
if DRY_RUN:
    print("MODE DRY-RUN -- aucune ecriture\n")

# 2. Update DBs
for db_path in DB_PATHS:
    if not os.path.exists(db_path):
        print(f"[SKIP] {db_path}\n")
        continue

    print(f"\n--- {os.path.basename(db_path)} ---")
    conn = sqlite3.connect(db_path)
    cur  = conn.cursor()
    cur.execute("SELECT id, name FROM pioveapp_product ORDER BY id")
    rows = cur.fetchall()

    updated = no_match = 0
    for pid, name in rows:
        if name not in csv_data:
            print(f"  NO_MATCH  id={pid}  '{name}'")
            no_match += 1
            continue

        d = csv_data[name]
        params, sets = [], []

        if d['short_description']:
            sets.append("short_description = ?")
            params.append(d['short_description'])
        if d['contenance'] is not None:
            sets.append("contenance = ?")
            params.append(d['contenance'])
            sets.append("contenance_unit = ?")
            params.append(d['contenance_unit'])

        if sets:
            print(f"  UPDATE id={pid:<5} '{name[:45]}'  cont={d['contenance']} {d['contenance_unit']}")
            if not DRY_RUN:
                cur.execute(f"UPDATE pioveapp_product SET {', '.join(sets)} WHERE id=?", params + [pid])
            updated += 1

    if not DRY_RUN:
        conn.commit()
    conn.close()
    print(f"  => Updated: {updated}  |  No match: {no_match}")

print("\nDone.")
