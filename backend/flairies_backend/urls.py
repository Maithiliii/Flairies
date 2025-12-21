from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from core.views import admin_dashboard_view, simple_health

urlpatterns = [
    path('', simple_health, name='health'),  # Root health check
    path('health/', simple_health, name='health_check'),
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('admin-dashboard/', admin_dashboard_view, name='admin_dashboard_web'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
