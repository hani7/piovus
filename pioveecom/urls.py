from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
import io, traceback


# ─── Emergency admin views ────────────────────────────────────────────────────

def run_migration_view(request):
    try:
        from django.core.management import call_command
        out = io.StringIO()
        call_command('migrate', interactive=False, stdout=out)
        return HttpResponse(f"Migration SUCCESSFUL!<br><pre>{out.getvalue()}</pre>")
    except Exception:
        return HttpResponse(f"Migration FAILED:<br><pre>{traceback.format_exc()}</pre>")


def setup_view(request):
    """
    One-shot setup: fixes M2M table via raw SQL + runs migrations + seeds categories.
    Call at https://api.piovecosmetics.dz/api/setup/
    """
    log = []

    # Step 1: Fix the missing M2M table directly with raw SQL (bypasses migration state)
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            # Check if table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pioveapp_product_categories'")
            exists = cursor.fetchone()
            if not exists:
                cursor.execute("""
                    CREATE TABLE "pioveapp_product_categories" (
                        "id"          integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                        "product_id"  integer NOT NULL REFERENCES "pioveapp_product" ("id"),
                        "category_id" integer NOT NULL REFERENCES "pioveapp_category" ("id"),
                        UNIQUE ("product_id", "category_id")
                    )
                """)
                log.append("✅ Table 'pioveapp_product_categories' CREATED via raw SQL")
            else:
                log.append("ℹ️  Table 'pioveapp_product_categories' already exists")

            # Also list all tables for diagnostics
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            tables = [row[0] for row in cursor.fetchall()]
            log.append(f"📋 DB Tables: {', '.join(tables)}")
    except Exception:
        log.append("❌ Raw SQL fix FAILED:\n" + traceback.format_exc())

    # Step 2: Run migrations
    try:
        from django.core.management import call_command
        out = io.StringIO()
        call_command('migrate', interactive=False, stdout=out)
        log.append("✅ Migrations: OK\n" + out.getvalue())
    except Exception:
        log.append("❌ Migrations FAILED:\n" + traceback.format_exc())

    # Step 3: Seed categories
    try:
        from pioveapp.models import Category
        CATEGORIES = [
            {'name': 'Eyes',            'slug': 'eyes',            'order': 1},
            {'name': 'Face',            'slug': 'face',            'order': 2},
            {'name': 'Lips',            'slug': 'lips',            'order': 3},
            {'name': 'Nails',           'slug': 'nails',           'order': 4},
            {'name': 'Skin Care & Body','slug': 'skin-care-body',  'order': 5},
            {'name': 'Accessoires',     'slug': 'accessoires',     'order': 6},
        ]
        created_cats = []
        for c in CATEGORIES:
            obj, created = Category.objects.get_or_create(slug=c['slug'], defaults=c)
            if created:
                created_cats.append(obj.name)
        log.append(f"✅ Categories: {len(created_cats)} created — {created_cats or 'all already exist'}")
    except Exception:
        log.append("❌ Categories FAILED:\n" + traceback.format_exc())

    # Step 4: Create/verify admin user
    try:
        from django.contrib.auth.models import User
        if not User.objects.filter(username='lotfi').exists():
            User.objects.create_superuser('lotfi', 'lotfi@piovecosmetics.dz', 'piove2026')
            log.append("✅ Superuser 'lotfi' created (password: piove2026)")
        else:
            log.append("ℹ️  User 'lotfi' already exists.")
    except Exception:
        log.append("❌ Superuser FAILED:\n" + traceback.format_exc())

    return HttpResponse("<br><br>".join(log).replace("\n", "<br>"))


urlpatterns = [
    path('piove-secure-gate-2026/', admin.site.urls),
    path('api/', include('pioveapp.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
