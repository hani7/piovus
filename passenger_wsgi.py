import os
import sys
import io
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Load server-specific config from .env.server (not in git) ────────────────
_config_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.server')
if os.path.exists(_config_file):
    with open(_config_file) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and '=' in _line and not _line.startswith('#'):
                _key, _val = _line.split('=', 1)
                os.environ.setdefault(_key.strip(), _val.strip())

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pioveecom.settings")

LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tmp', 'migrate.log')

try:
    # ── Install PyMySQL as MySQLdb driver (for MySQL support) ────────────────
    try:
        import pymysql
        pymysql.install_as_MySQLdb()
    except ImportError:
        pass  # Not installed yet, will work after pip install

    import django
    django.setup()

    # ── Run pending migrations ────────────────────────────────────────────────
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
            f.write("=== STARTUP FAILED ===\n")
            f.write(traceback.format_exc())
    except Exception:
        pass

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
