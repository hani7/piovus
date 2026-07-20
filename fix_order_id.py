import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')
django.setup()

from django.db import connection

# Lecture du max actuel
cursor = connection.cursor()
cursor.execute("SELECT MAX(id) FROM pioveapp_order")
max_id = cursor.fetchone()[0] or 0
print(f"Max ID actuel : {max_id}")
cursor.close()

# Calcul du prochain ID
next_id = 2623
if next_id <= max_id:
    next_id = max_id + 1
    print(f"INFO : Ajusté à {next_id} car max actuel = {max_id}")

# Reset AUTO_INCREMENT via connexion brute (bypass Django transaction)
raw_conn = connection.connection
raw_cursor = raw_conn.cursor()
raw_cursor.execute(f"ALTER TABLE pioveapp_order AUTO_INCREMENT = {next_id}")
raw_conn.commit()
raw_cursor.close()

print(f"SUCCES — Prochaine commande sera #{next_id}")
