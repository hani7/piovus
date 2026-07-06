import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pioveecom.settings")

# Auto-migration au démarrage — ne doit JAMAIS crasher l'app
try:
    import django
    django.setup()
    from django.core.management import call_command
    call_command('migrate', interactive=False, verbosity=0)
except Exception:
    pass  # On continue quoi qu'il arrive

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
