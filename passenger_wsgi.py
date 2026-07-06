import os
import sys
import traceback

# Assurez-vous que le chemin pointe vers le dossier contenant manage.py
sys.path.insert(0, os.path.dirname(__file__))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pioveecom.settings")

# --- AUTOMATIC MIGRATION (safe) ---
try:
    import django
    django.setup()
    from django.core.management import call_command
    call_command('migrate', '--run-syncdb', interactive=False, verbosity=0)
except Exception:
    traceback.print_exc()  # log mais ne crash pas
# -------------------------------------------

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
