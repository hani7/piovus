# restart: 2026-07-21T11:35
import os
import sys
import io
import traceback
import subprocess

try:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pioveecom.settings")

    LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tmp', 'migrate.log')
    try:
        os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    except Exception:
        pass

    # Auto git pull on every restart
    try:
        _repo_dir = os.path.dirname(os.path.abspath(__file__))
        _pull_result = subprocess.run(
            ['git', 'pull', 'origin', 'main'],
            cwd=_repo_dir,
            capture_output=True, text=True, timeout=30
        )
        with open(LOG_PATH, 'a') as _f:
            _f.write(f"\n[git pull] stdout: {_pull_result.stdout.strip()}\n")
            _f.write(f"[git pull] stderr: {_pull_result.stderr.strip()}\n")
    except Exception as _e:
        try:
            with open(LOG_PATH, 'a') as _f:
                _f.write(f"\n[git pull] FAILED: {_e}\n")
        except Exception:
            pass

    # Clear stale __pycache__ for pioveapp.views to prevent conflicts
    # between old views.pyc and the new views/ package after git pull
    try:
        import glob
        _app_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pioveapp')
        _stale = glob.glob(os.path.join(_app_dir, '__pycache__', 'views.cpython-*.pyc'))
        for _f_path in _stale:
            os.remove(_f_path)
        if _stale:
            with open(LOG_PATH, 'a') as _f:
                _f.write(f"[pycache] Removed {len(_stale)} stale views.pyc file(s)\n")
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
        try:
            with open(LOG_PATH, 'w') as f:
                f.write("=== MIGRATE SUCCESS ===\n")
                f.write(out.getvalue())
        except Exception:
            pass

    except Exception:
        try:
            with open(LOG_PATH, 'a') as f:
                f.write("=== STARTUP FAILED ===\n")
                f.write(traceback.format_exc())
        except Exception:
            pass

    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()

except Exception:
    import traceback
    def application(environ, start_response):
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [b"CRITICAL WSGI GLOBAL ERROR:\n\n" + traceback.format_exc().encode('utf-8')]
