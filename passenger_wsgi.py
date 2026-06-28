import os
import sys

# Assurez-vous que le chemin pointe vers le dossier contenant manage.py
sys.path.insert(0, os.path.dirname(__file__))

# Définissez vos variables d'environnement si nécessaire (ou lisez-les depuis un fichier .env)
# Exemple : os.environ['DJANGO_SECRET_KEY'] = 'votre_clef'

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pioveecom.settings")

from django.core.wsgi import get_wsgi_application

# --- AUTOMATIC MIGRATION HACK FOR CPANEL ---
try:
    import django
    django.setup()
    from django.core.management import call_command
    call_command('migrate', interactive=False)
except Exception as e:
    print(f"Migration error: {e}")
# -------------------------------------------

application = get_wsgi_application()
