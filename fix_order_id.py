import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')
django.setup()

# Lire les credentials DB depuis Django settings
from django.conf import settings
db = settings.DATABASES['default']

print("Connexion directe MySQL...")
print(f"Host: {db.get('HOST', 'localhost')}")
print(f"DB: {db.get('NAME', '?')}")

try:
    import MySQLdb
    conn = MySQLdb.connect(
        host=db.get('HOST', 'localhost'),
        user=db.get('USER', ''),
        passwd=db.get('PASSWORD', ''),
        db=db.get('NAME', ''),
        port=int(db.get('PORT', 3306) or 3306),
    )
    print("Connexion MySQLdb OK")
except ImportError:
    try:
        import pymysql as MySQLdb
        conn = MySQLdb.connect(
            host=db.get('HOST', 'localhost'),
            user=db.get('USER', ''),
            password=db.get('PASSWORD', ''),
            database=db.get('NAME', ''),
            port=int(db.get('PORT', 3306) or 3306),
        )
        print("Connexion pymysql OK")
    except ImportError:
        print("ERREUR: ni MySQLdb ni pymysql disponibles")
        exit(1)

cur = conn.cursor()
cur.execute("SELECT MAX(id) FROM pioveapp_order")
max_id = cur.fetchone()[0] or 0
print(f"Max ID actuel : {max_id}")

next_id = 2623
if next_id <= max_id:
    next_id = max_id + 1
    print(f"Ajuste a {next_id}")

cur.execute(f"ALTER TABLE pioveapp_order AUTO_INCREMENT = {next_id}")
conn.commit()
cur.close()
conn.close()

print(f"SUCCES — Prochaine commande = #{next_id}")
