import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pioveecom.settings")

_APP_DIR = os.path.dirname(os.path.abspath(__file__))

# Auto-migration au démarrage — log les erreurs pour debug
try:
    import django
    django.setup()
    from django.core.management import call_command
    call_command('migrate', interactive=False, verbosity=1)
    with open(os.path.join(_APP_DIR, 'migration.log'), 'w') as f:
        f.write('Migrations OK\n')
except BaseException as e:
    import traceback
    with open(os.path.join(_APP_DIR, 'migration.log'), 'w') as f:
        f.write(f'MIGRATION ERROR: {e}\n')
        traceback.print_exc(file=f)

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
