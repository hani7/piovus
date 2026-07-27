# restart: 2026-07-27T12:08
import os
import sys
import io
import traceback
import subprocess

_STARTUP_ERROR = None  # Capture l'erreur de démarrage

try:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pioveecom.settings")

    LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tmp', 'migrate.log')
    try:
        os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    except Exception:
        pass

    # Force sync with remote
    try:
        _repo_dir = os.path.dirname(os.path.abspath(__file__))
        subprocess.run(['git', 'fetch', 'origin', 'main'], cwd=_repo_dir, capture_output=True, timeout=30)
        _reset = subprocess.run(['git', 'reset', '--hard', 'origin/main'], cwd=_repo_dir, capture_output=True, text=True, timeout=30)
        subprocess.run(['git', 'clean', '-fd'], cwd=_repo_dir, capture_output=True, timeout=30)
        with open(LOG_PATH, 'a') as _f:
            _f.write(f"\n[git reset] {_reset.stdout.strip()}\n")
            if _reset.returncode != 0:
                _f.write(f"[git reset] ERROR: {_reset.stderr.strip()}\n")
    except Exception as _e:
        try:
            with open(LOG_PATH, 'a') as _f:
                _f.write(f"\n[git sync] FAILED: {_e}\n")
        except Exception:
            pass

    try:
        import django
    except ImportError:
        try:
            req_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'requirements.txt')
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', req_path, '--quiet'])
            import django
        except Exception:
            try:
                with open(LOG_PATH, 'a') as f:
                    f.write("=== FAILED TO INSTALL REQUIREMENTS ===\n")
                    f.write(traceback.format_exc())
            except Exception:
                pass

    try:
        django.setup()

        from django.db import connection
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
                pass

        from django.core.management import call_command
        out = io.StringIO()
        call_command('migrate', interactive=False, verbosity=1, stdout=out)
        try:
            with open(LOG_PATH, 'w') as f:
                f.write("=== MIGRATE SUCCESS ===\n")
                f.write(out.getvalue())
        except Exception:
            pass

    except Exception:
        _STARTUP_ERROR = traceback.format_exc()  # Capture ici, dans le except
        try:
            with open(LOG_PATH, 'a') as f:
                f.write("=== STARTUP FAILED ===\n")
                f.write(_STARTUP_ERROR)
        except Exception:
            pass

    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()

except Exception:
    _STARTUP_ERROR = traceback.format_exc()  # Capture ici, dans le except
    try:
        LOG_PATH2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tmp', 'migrate.log')
        os.makedirs(os.path.dirname(LOG_PATH2), exist_ok=True)
        with open(LOG_PATH2, 'a') as _f:
            _f.write("=== CRITICAL WSGI ERROR ===\n")
            _f.write(_STARTUP_ERROR)
    except Exception:
        pass

    def application(environ, start_response):
        path = environ.get('PATH_INFO', '')
        if path == '/debug-error/':
            start_response('200 OK', [('Content-Type', 'text/plain; charset=utf-8')])
            return [("STARTUP ERROR:\n\n" + (_STARTUP_ERROR or 'Aucune erreur capturee')).encode('utf-8')]
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain; charset=utf-8')])
        return [b"Django ne demarre pas. Voir /debug-error/ pour les details."]
