from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
import io, traceback, subprocess, os


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


def run_migration_view(request):
    try:
        import io, traceback
        from django.core.management import call_command
        from django.http import HttpResponse
        out = io.StringIO()
        call_command('migrate', interactive=False, stdout=out)
        return HttpResponse(f"Migration SUCCESSFUL!<br><pre>{out.getvalue()}</pre>")
    except Exception:
        import traceback
        from django.http import HttpResponse
        return HttpResponse(f"Migration FAILED:<br><pre>{traceback.format_exc()}</pre>")


def setup_staff_accounts_view(request):
    from django.contrib.auth.models import User, Group
    from django.http import HttpResponse
    log = []
    try:
        group, _ = Group.objects.get_or_create(name='marketing')
        log.append("Groupe 'marketing' OK")

        accounts = [
            ('amira',     'Piove@Amira2026',   'Amira',     False),
            ('oubaida',   'Piove@Oubaida2026', 'Oubaida',   False),
            ('marketing', 'Piove@Mktg2026',    'Marketing', True),
            ('gerant',    'Piove@Gerant2026',  'Gérant',    False),
        ]
        for username, pwd, fname, is_marketing in accounts:
            u, created = User.objects.get_or_create(username=username)
            if created:
                u.set_password(pwd)
                log.append(f"Cree: {username}")
            else:
                log.append(f"Existait: {username}")
            u.first_name = fname
            u.is_staff = True
            u.save()
            if is_marketing:
                u.groups.set([group])
                log.append(f"  -> groupe marketing")
            else:
                u.groups.clear()
                log.append(f"  -> acces complet (comme lotfi)")

        # Create/update Django admin superuser
        su, su_created = User.objects.get_or_create(username='piove_admin')
        su.set_password('Piove@DjangoAdmin2026!')
        su.is_staff = True
        su.is_superuser = True
        su.first_name = 'Piove'
        su.last_name = 'Admin'
        su.save()
        if su_created:
            log.append("Superuser Django cree: piove_admin")
        else:
            log.append("Superuser Django mis a jour: piove_admin")

        return HttpResponse("<br>".join(log) + "<br><br><b>TERMINE!</b>")
    except Exception:
        import traceback
        return HttpResponse(f"ERREUR:<br><pre>{traceback.format_exc()}</pre>")


def fix_yassir_view(request):
    """Secret URL: corrige les commandes Yassir mal enregistrées + git pull + restart."""
    log = []
    base_dir = settings.BASE_DIR

    # Step 1: git pull
    try:
        result = subprocess.run(
            ['git', 'pull', 'origin', 'main'],
            cwd=str(base_dir),
            capture_output=True, text=True, timeout=30
        )
        log.append(f'✅ git pull: {result.stdout.strip() or "OK"}')
        if result.stderr:
            log.append(f'   stderr: {result.stderr.strip()}')
    except Exception as e:
        log.append(f'⚠️ git pull impossible: {e}')

    # Step 1.5: Run migrations
    try:
        res_mig = subprocess.run(
            ['python', 'manage.py', 'migrate'],
            cwd=str(base_dir),
            capture_output=True, text=True, timeout=30
        )
        log.append(f'✅ migrate: {res_mig.stdout.strip() or "OK"}')
        if res_mig.stderr:
            log.append(f'   stderr: {res_mig.stderr.strip()}')
    except Exception as e:
        log.append(f'⚠️ migrate impossible: {e}')

    # Step 2: Fix Yassir orders
    try:
        from pioveapp.models import Order
        # Commandes avec yassir_payment_id mais payment_method != yassir
        bad_orders = Order.objects.filter(
            yassir_payment_id__isnull=False
        ).exclude(yassir_payment_id='').exclude(payment_method='yassir')

        fixed = []
        for o in bad_orders:
            o.payment_method = 'yassir'
            o.save(update_fields=['payment_method'])
            fixed.append(f'#{o.id}')

        # Also fix by order_id param if provided
        order_id = request.GET.get('order_id')
        if order_id:
            try:
                o = Order.objects.get(pk=int(order_id))
                o.payment_method = 'yassir'
                o.save(update_fields=['payment_method'])
                if f'#{o.id}' not in fixed:
                    fixed.append(f'#{o.id} (forcé)')
            except Order.DoesNotExist:
                log.append(f'⚠️ Commande #{order_id} introuvable')

        if fixed:
            log.append(f'✅ Commandes corrigées: {', '.join(fixed)}')
        else:
            log.append('ℹ️ Aucune commande à corriger (ou déjà à jour)')
    except Exception:
        log.append(f'❌ Fix orders FAILED:<br><pre>{traceback.format_exc()}</pre>')

    # Step 3: Restart app via touch passenger_wsgi.py
    try:
        wsgi_path = os.path.join(str(base_dir), 'passenger_wsgi.py')
        if os.path.exists(wsgi_path):
            os.utime(wsgi_path, None)
            log.append('✅ App redémarrée (passenger_wsgi.py touched)')
        else:
            log.append('⚠️ passenger_wsgi.py introuvable')
    except Exception as e:
        log.append(f'⚠️ Restart: {e}')

    html = '<br><br>'.join(log)
    return HttpResponse(f'<h2>Fix Yassir — Piové</h2>{html}<br><br><b>TERMINÉ ✅</b>')


def yassir_test_view(request):
    """
    Diagnostic complet Yassir — suit exactement le Quick Start officiel :
    https://stg-docs.payment.yassir.io/getting-started/quick-start

    Étapes :
    1. Register Customer  (POST /api/v1/customers)
    2. Create Payment Intent (POST /api/v1/payments/intents)
    3. Proceed Wallet  (POST /api/v1/payments/intents/{id}/proceed + x-client-secret)

    Usage : GET /api/test-yassir-998877/?phone=0550123456&amount=100
    """
    import base64, json as _json
    import requests as _req

    phone  = request.GET.get('phone',  '0550000000')
    amount = float(request.GET.get('amount', '100'))  # 0 DA est autorisé pour les tests

    # ── Credentials ──────────────────────────────────────────────────────────
    import os
    CLIENT_ID     = os.environ.get('YASSIR_CLIENT_ID',     'EXT_PIOVE_SHOP.EXT_PIOVE_SHOP.01M07X5FPQWRV1HJTWR06SBH2G')
    CLIENT_SECRET = os.environ.get('YASSIR_CLIENT_SECRET', 'e4f3ad4ff8cdd772d7445d279653d3a265048f1f796b71606a185e80c40f67dad0f122d253d88ac4913e4ea2555732bdb8ab1eea99fb3d823464111161a5bf0b')
    SERVICE       = os.environ.get('YASSIR_SERVICE_CODE',  'EXT_PIOVE_SHOP')
    _raw          = os.environ.get('YASSIR_BASE_URL', 'https://stg-api.payment.yassir.io').rstrip('/')
    BASE_URL      = ('https://stg-api.payment.yassir.io' if 'payment.yassir.io' not in _raw else _raw)

    token = 'Bearer ' + base64.b64encode(f'{CLIENT_ID}:{CLIENT_SECRET}'.encode()).decode()
    base_headers = {
        'Authorization':  token,
        'Content-Type':   'application/json',
        'x-platform':     'API',
        'x-service':      SERVICE,
        'x-country-code': 'DZA',
        'x-locale':       'fr_FR',
    }

    # Normalize phone
    p = phone.strip().replace(' ', '')
    if p.startswith('0'):      p = '+213' + p[1:]
    elif p.startswith('213'):  p = '+' + p
    elif not p.startswith('+'): p = '+213' + p

    lines = [f'<h2>🧪 Yassir Quick Start Diagnostic</h2>']
    lines.append(f'<b>BASE_URL:</b> {BASE_URL}')
    lines.append(f'<b>SERVICE:</b>  {SERVICE}')
    lines.append(f'<b>CLIENT_ID:</b> {CLIENT_ID[:30]}...')
    lines.append(f'<b>Phone:</b>    {p}')
    lines.append(f'<b>Amount:</b>   {amount} DZD')
    lines.append('<hr>')

    payment_id    = None
    client_secret = None

    # ── STEP 1: Register Customer ─────────────────────────────────────────────
    lines.append('<h3>📌 Step 1 — Register Customer</h3>')
    try:
        r1 = _req.post(
            f'{BASE_URL}/api/v1/customers',
            json={'name': 'Test Piove', 'phone': p, 'isActive': True},
            headers=base_headers, timeout=15
        )
        lines.append(f'<b>Status:</b> {r1.status_code}')
        try:
            lines.append(f'<b>Response:</b> <pre>{_json.dumps(r1.json(), indent=2, ensure_ascii=False)}</pre>')
        except Exception:
            lines.append(f'<b>Raw:</b> <pre>{r1.text[:500]}</pre>')
        # Staging = 400 "Customer already exists" / Production = 409
        body_msg = ''
        try: body_msg = r1.json().get('message', '').lower()
        except Exception: pass
        is_existing = r1.status_code in (200, 201, 409) or (
            r1.status_code == 400 and 'already exists' in body_msg
        )
        if is_existing:
            lines.append('✅ OK (client déjà existant ou créé avec succès)')
        else:
            lines.append(f'❌ ERREUR — arrêt du test')
            return HttpResponse('<br>'.join(lines))
    except Exception as e:
        lines.append(f'❌ Exception: {e}')
        return HttpResponse('<br>'.join(lines))

    lines.append('<hr>')

    # ── STEP 2: Create Payment Intent ─────────────────────────────────────────
    lines.append('<h3>📌 Step 2 — Create Payment Intent</h3>')
    try:
        r2 = _req.post(
            f'{BASE_URL}/api/v1/payments/intents?countryCode=DZA',
            json={
                'actionId':           'test_piove_999',
                'amount':             amount,
                'actionCurrencyCode': 'DZD',
                'actionCountryCode':  'DZA',
                'userId':             p,
                'captureMethod':      'DIRECT',
            },
            headers=base_headers, timeout=15
        )
        lines.append(f'<b>Status:</b> {r2.status_code}')
        try:
            r2_json = r2.json()
            lines.append(f'<b>Response:</b> <pre>{_json.dumps(r2_json, indent=2, ensure_ascii=False)}</pre>')
            data2 = r2_json.get('data', {})
            payment_id    = data2.get('paymentId') or data2.get('id')
            client_secret = data2.get('clientSecret', '')
        except Exception:
            lines.append(f'<b>Raw:</b> <pre>{r2.text[:500]}</pre>')
        if r2.status_code in (200, 201) and payment_id:
            lines.append(f'✅ OK — paymentId: <b>{payment_id}</b>')
            lines.append(f'✅ clientSecret: <b>{client_secret[:30]}...</b>')
        else:
            lines.append(f'❌ ERREUR — arrêt du test (pas de paymentId)')
            return HttpResponse('<br>'.join(lines))
    except Exception as e:
        lines.append(f'❌ Exception: {e}')
        return HttpResponse('<br>'.join(lines))

    lines.append('<hr>')

    # ── STEP 3: Proceed Wallet ────────────────────────────────────────────────
    lines.append('<h3>📌 Step 3 — Proceed Wallet (WALLET_V2)</h3>')
    proceed_headers = dict(base_headers)
    proceed_headers['x-client-secret'] = client_secret
    lines.append(f'<b>x-client-secret:</b> {client_secret[:30]}...')
    try:
        r3 = _req.post(
            f'{BASE_URL}/api/v1/payments/intents/{payment_id}/proceed',
            json={'paymentMethodCode': 'WALLET_V2'},
            headers=proceed_headers, timeout=15
        )
        lines.append(f'<b>Status:</b> {r3.status_code}')
        try:
            r3_json = r3.json()
            lines.append(f'<b>Response:</b> <pre>{_json.dumps(r3_json, indent=2, ensure_ascii=False)}</pre>')
            data3       = r3_json.get('data', {})
            status_c    = data3.get('statusCode')
            require_3ds = data3.get('require3DS', False)
            meta3       = data3.get('metadata') or data3.get('metaData') or {}
            pay_url     = meta3.get('payUrl', '')
            # Normalisation : require3DS=True OU payUrl present => statusCode 12
            if status_c is None:
                status_c = 12 if (require_3ds or pay_url) else 2
            lines.append(f'<b>statusCode (normalisé):</b> {status_c} | require3DS: {require_3ds}')
            if status_c == 12 and pay_url:
                lines.append(f'✅ OTP requis &mdash; <a href="{pay_url}" target="_blank">Cliquer pour tester le paiement OTP Yassir &rarr;</a>')
                lines.append(f'<small>payUrl: {pay_url}</small>')
            elif status_c == 2:
                lines.append('✅ Paiement DIRECT réussi (sans OTP)!')
            elif status_c == 3:
                lines.append('⚠️ Paiement rejeté (solde insuffisant?)')
            else:
                lines.append(f'⚠️ statusCode inattendu: {status_c}')
        except Exception:
            lines.append(f'<b>Raw:</b> <pre>{r3.text[:1000]}</pre>')
    except Exception as e:
        lines.append(f'❌ Exception: {e}')

    lines.append('<hr><b>✅ Test terminé.</b>')
    return HttpResponse('<br>'.join(lines))


urlpatterns = [
    #path('admin/', include('admin_honeypot.urls', namespace='admin_honeypot')),
    path('piove-secure-gate-2026/', admin.site.urls),
    path('api/run-migrations-secret-key-998877/', run_migration_view),
    path('api/setup-staff-998877/', setup_staff_accounts_view),
    path('api/fix-yassir-998877/', fix_yassir_view),
    path('api/test-yassir-998877/', yassir_test_view),
    path('api/', include('pioveapp.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
