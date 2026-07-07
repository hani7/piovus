import os
import sys
import io
import traceback
import subprocess

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pioveecom.settings")

LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tmp', 'migrate.log')
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

try:
    import django
except ImportError:
    try:
        req_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'requirements.txt')
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', req_path, '--quiet'])
        import django
    except Exception:
        with open(LOG_PATH, 'a') as f:
            f.write("=== FAILED TO INSTALL REQUIREMENTS ===\n")
            f.write(traceback.format_exc())

try:
    django.setup()

    from django.db import connection
    with connection.cursor() as cursor:
        # Step 1: Create M2M table if it doesn't exist
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' "
            "AND name='pioveapp_product_categories'"
        )
        if not cursor.fetchone():
            cursor.execute("""
                CREATE TABLE "pioveapp_product_categories" (
                    "id"          integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                    "product_id"  integer NOT NULL REFERENCES "pioveapp_product" ("id"),
                    "category_id" integer NOT NULL REFERENCES "pioveapp_category" ("id"),
                    UNIQUE ("product_id", "category_id")
                )
            """)

        # Step 2: If the table exists but migration 0037 isn't recorded,
        # fake-apply it so Django doesn't try to recreate the table
        try:
            cursor.execute(
                "SELECT id FROM django_migrations "
                "WHERE app='pioveapp' AND name='0037_product_categories'"
            )
            if not cursor.fetchone():
                from django.utils import timezone
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) "
                    "VALUES ('pioveapp', '0037_product_categories', ?)",
                    [timezone.now().isoformat()]
                )
        except Exception:
            pass  # django_migrations may not exist yet on first run

    from django.core.management import call_command
    out = io.StringIO()
    call_command('migrate', interactive=False, verbosity=1, stdout=out)
    with open(LOG_PATH, 'w') as f:
        f.write("=== MIGRATE SUCCESS ===\n")
        f.write(out.getvalue())

except Exception:
    with open(LOG_PATH, 'a') as f:
        f.write("=== STARTUP FAILED ===\n")
        f.write(traceback.format_exc())

try:
    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()
except Exception:
    import traceback
    def application(environ, start_response):
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [b"CRITICAL WSGI STARTUP ERROR:\n\n" + traceback.format_exc().encode('utf-8')]
