import os
import sqlite3

# Chemin direct vers la base SQLite
DB_PATH = os.path.join(os.path.dirname(__file__), 'db.sqlite3')
print(f"Base SQLite : {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Max ID actuel
cur.execute("SELECT MAX(id) FROM pioveapp_order")
max_id = cur.fetchone()[0] or 0
print(f"Max ID actuel : {max_id}")

next_id = 2623
if next_id <= max_id:
    next_id = max_id + 1
    print(f"Ajuste a {next_id}")

# Reset sequence SQLite (seq = next_id - 1)
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'")
if cur.fetchone():
    cur.execute("SELECT seq FROM sqlite_sequence WHERE name='pioveapp_order'")
    row = cur.fetchone()
    if row:
        cur.execute("UPDATE sqlite_sequence SET seq = ? WHERE name = 'pioveapp_order'", (next_id - 1,))
        print(f"sqlite_sequence mis a jour : seq = {next_id - 1}")
    else:
        cur.execute("INSERT INTO sqlite_sequence (name, seq) VALUES ('pioveapp_order', ?)", (next_id - 1,))
        print(f"sqlite_sequence insere : seq = {next_id - 1}")
else:
    print("Table sqlite_sequence introuvable (aucun AUTOINCREMENT encore utilise)")

conn.commit()
conn.close()
print(f"SUCCES — Prochaine commande = #{next_id}")
