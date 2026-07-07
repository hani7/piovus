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

    from django.db import connection

    # ── Fix: create missing M2M table if it doesn't exist ────────────────────
    # This table was added in migration 0037 but may be missing on production
    # due to a corrupted migration state. Safe to run every time (IF NOT EXISTS).
    with connection.cursor() as cursor:
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
