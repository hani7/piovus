import os
import sys
import io
import traceback
import subprocess

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Load server config from .env.server ──────────────────────────────────────
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
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

# ── Step 1: Install PyMySQL if needed ────────────────────────────────────────
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    try:
        # Auto-install PyMySQL using the current Python executable
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'PyMySQL', '--quiet'])
        import pymysql
        pymysql.install_as_MySQLdb()
        with open(LOG_PATH, 'a') as f:
            f.write("=== PyMySQL auto-installed successfully ===\n")
    except Exception:
        # PyMySQL install failed — remove DATABASE_URL to fall back to SQLite
        os.environ.pop('DATABASE_URL', None)
        with open(LOG_PATH, 'a') as f:
            f.write("=== PyMySQL install FAILED, falling back to SQLite ===\n")
            f.write(traceback.format_exc())

# ── Step 2: Setup Django & run migrations ────────────────────────────────────
try:
    import django
    django.setup()

    from django.core.management import call_command
    out = io.StringIO()
    call_command('migrate', interactive=False, verbosity=1, stdout=out)
    with open(LOG_PATH, 'a') as f:
        f.write("=== MIGRATE SUCCESS ===\n")
        f.write(out.getvalue())

except Exception:
    with open(LOG_PATH, 'a') as f:
        f.write("=== STARTUP FAILED ===\n")
        f.write(traceback.format_exc())

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
