import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ['DJANGO_SETTINGS_MODULE'] = 'pioveecom.settings'
from django.conf import settings

settings.DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
settings.CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
settings.STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}

import django
django.setup()
if '--baseline' in sys.argv:
    import ast
    import subprocess
    from pioveapp import views
    sys.argv.remove('--baseline')
    original = subprocess.check_output(['git', 'show', 'HEAD:pioveapp/views.py']).decode('utf-8')
    viewset = next(node for node in ast.parse(original).body if isinstance(node, ast.ClassDef) and node.name == 'OrderViewSet')
    method = next(node for node in viewset.body if isinstance(node, ast.FunctionDef) and node.name == 'get_queryset')
    namespace = dict(vars(views))
    exec(compile(ast.Module(body=[method], type_ignores=[]), '<original-order-queryset>', 'exec'), namespace)
    views.OrderViewSet.get_queryset = namespace['get_queryset']
from django.core.management import call_command
call_command('test', *(sys.argv[1:] or ['pioveapp.test_order_ownership']), verbosity=1, interactive=False)
