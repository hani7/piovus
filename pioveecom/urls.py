from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from django.http import HttpResponse

def run_migration_view(request):
    try:
        from django.core.management import call_command
        import io
        out = io.StringIO()
        call_command('migrate', interactive=False, stdout=out)
        return HttpResponse(f"Migration SUCCESSFUL!<br><pre>{out.getvalue()}</pre>")
    except Exception as e:
        import traceback
        return HttpResponse(f"Migration FAILED:<br><pre>{traceback.format_exc()}</pre>")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/run-migrations/', run_migration_view),
    path('api/', include('pioveapp.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
