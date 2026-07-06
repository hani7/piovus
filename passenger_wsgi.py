import os
import sys
import io
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pioveecom.settings")

LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tmp', 'migrate.log')

try:
    import django
    django.setup()
    from django.core.management import call_command
    out = io.StringIO()
    call_command('migrate', interactive=False, verbosity=1, stdout=out)
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, 'w') as f:
        f.write("=== MIGRATE SUCCESS ===\n")
        f.write(out.getvalue())
except Exception:
    try:
        os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
        with open(LOG_PATH, 'w') as f:
            f.write("=== MIGRATE FAILED ===\n")
            f.write(traceback.format_exc())
    except Exception:
        pass

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
