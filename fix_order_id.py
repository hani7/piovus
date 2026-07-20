import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')
django.setup()

from django.db import connection

# Connexion et lecture du max
connection.ensure_connection()

cur = connection.connection.cursor()
cur.execute("SELECT MAX(id) FROM pioveapp_order")
max_id = cur.fetchone()[0] or 0
print(f"Max ID actuel : {max_id}")
cur.close()

# Prochain ID cible
next_id = 2623
if next_id <= max_id:
    next_id = max_id + 1
    print(f"INFO : Ajuste a {next_id} car max = {max_id}")

# ALTER TABLE en autocommit
connection.connection.autocommit = True
cur2 = connection.connection.cursor()
cur2.execute(f"ALTER TABLE pioveapp_order AUTO_INCREMENT = {next_id}")
cur2.close()
connection.connection.autocommit = False

print(f"SUCCES — Prochaine commande = #{next_id}")
