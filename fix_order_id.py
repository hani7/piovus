import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')
django.setup()

from django.db import connection

with connection.cursor() as c:
    c.execute("SELECT MAX(id) FROM pioveapp_order")
    max_id = c.fetchone()[0] or 0
    print(f"Max ID actuel : {max_id}")

    next_id = 2623
    if next_id <= max_id:
        print(f"ERREUR : ID {next_id} <= max actuel ({max_id}). Utilise {max_id + 1} à la place.")
        next_id = max_id + 1

    c.execute(f"ALTER TABLE pioveapp_order AUTO_INCREMENT = {next_id}")
    print(f"OK — Prochaine commande sera #{next_id}")
