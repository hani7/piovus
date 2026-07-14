import csv, sqlite3, re, sys, os

CSV_PATH = r"C:\Users\PC\Downloads\wc-product-export-fixed.csv"
DB_PATH  = r"C:\Users\PC\Documents\piove\db.sqlite3"

def clean_html(text):
    text = re.sub(r'<[^>]+>', '', text or '')
    return re.sub(r'\s+', ' ', text.replace('\\n', ' ')).strip()

def extract_contenance(s):
    m = re.match(r'^(\d+(?:[.,]\d+)?)\s*(ml|g|L|cl|oz|kg)\b', s.strip(), re.IGNORECASE)
    if m:
        return float(m.group(1).replace(',', '.')), m.group(2).lower()
    return None, None

# -- Ajouter colonnes si manquantes --
conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()
cols = [r[1] for r in cur.execute("PRAGMA table_info(pioveapp_product)")]
if 'contenance' not in cols:
    cur.execute("ALTER TABLE pioveapp_product ADD COLUMN contenance REAL")
    print("Colonne 'contenance' ajoutee")
if 'contenance_unit' not in cols:
    cur.execute("ALTER TABLE pioveapp_product ADD COLUMN contenance_unit TEXT DEFAULT ''")
    print("Colonne 'contenance_unit' ajoutee")
if 'short_description' not in cols:
    cur.execute("ALTER TABLE pioveapp_product ADD COLUMN short_description TEXT DEFAULT ''")
    print("Colonne 'short_description' ajoutee")
conn.commit()

# -- Charger CSV --
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
print(f"CSV: {len(csv_data)} produits")

# -- Migrer (force overwrite) --
cur.execute("SELECT id, name FROM pioveapp_product ORDER BY id")
updated = no_match = 0
for pid, name in cur.fetchall():
    if name not in csv_data:
        print(f"  NO_MATCH  id={pid}  '{name}'")
        no_match += 1
        continue
    d = csv_data[name]
    sets, params = [], []
    if d['short_description']:
        sets.append("short_description = ?"); params.append(d['short_description'])
    if d['contenance'] is not None:
        sets.append("contenance = ?");      params.append(d['contenance'])
        sets.append("contenance_unit = ?"); params.append(d['contenance_unit'])
    if sets:
        cur.execute(f"UPDATE pioveapp_product SET {', '.join(sets)} WHERE id=?", params + [pid])
        print(f"  UPDATE id={pid:<5} '{name[:45]}'  cont={d['contenance']} {d['contenance_unit']}")
        updated += 1

conn.commit()
conn.close()
print(f"\nDone. Updated: {updated} | No match: {no_match}")
