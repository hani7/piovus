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
    One-shot setup: runs migrations + seeds categories + creates superuser.
    Call once at https://api.piovecosmetics.dz/api/setup/
    """
    log = []
    try:
        from django.core.management import call_command
        out = io.StringIO()
        call_command('migrate', interactive=False, stdout=out)
        log.append("✅ Migrations: OK\n" + out.getvalue())
    except Exception:
        log.append("❌ Migrations FAILED:\n" + traceback.format_exc())

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

    try:
        from django.contrib.auth.models import User
        if not User.objects.filter(username='lotfi').exists():
            User.objects.create_superuser('lotfi', 'lotfi@piovecosmetics.dz', 'piove2026')
            log.append("✅ Superuser 'lotfi' created (password: piove2026) — CHANGE IT NOW!")
        else:
            log.append("ℹ️  User 'lotfi' already exists.")
    except Exception:
        log.append("❌ Superuser FAILED:\n" + traceback.format_exc())

    return HttpResponse("<br><br>".join(log).replace("\n", "<br>"))


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/run-migrations/', run_migration_view),
    path('api/setup/', setup_view),
    path('api/', include('pioveapp.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
