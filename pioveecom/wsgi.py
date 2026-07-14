"""
WSGI config for pioveecom project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pioveecom.settings')

# ─── Auto-migrate on startup ───────────────────────────────────────────────────
# Applies any pending migrations automatically when the cPanel app restarts.
# No terminal or phpMyAdmin needed — just restart the Python app in cPanel.
try:
    from django.core.management import call_command
    call_command('migrate', '--run-syncdb', verbosity=0)
except Exception as e:
    import logging
    logging.getLogger(__name__).warning(f"Auto-migrate warning: {e}")
# ──────────────────────────────────────────────────────────────────────────────

application = get_wsgi_application()
