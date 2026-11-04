from django.contrib import admin
from django.urls import path, include, re_path
from django.http import Http404
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from django.views.generic import TemplateView
from django.views.static import serve
from django.conf import settings
from django.conf.urls.static import static
from .page_views import (
    MarketplacePage, ComponentsPage, ComponentPickerPage,
    BuildsPage, BuilderPage, ListingDetailPage,
    LoginPageView, RegisterPageView
)

spa_view = TemplateView.as_view(template_name='spa_index.html')


def admin_hidden_404(request, *args, **kwargs):
    raise Http404("Page not found")


urlpatterns = [
    path('', MarketplacePage.as_view(), name='marketplace'),
    path('builder/', BuilderPage.as_view(), name='builder'),
    path('builds/', BuildsPage.as_view(), name='builds'),
    path('chat/', spa_view, name='chat'),
    path('messages/', spa_view, name='messages'),
    path('checkout/', spa_view, name='checkout'),
    path('parts/<int:listing_id>/', ListingDetailPage.as_view(), name='product-detail'),
    path('profile/', spa_view, name='profile-page'),
    path('components/', ComponentsPage.as_view(), name='components'),
    path('components/picker/', ComponentPickerPage.as_view(), name='component-picker'),
    path('accounts/login/', LoginPageView.as_view(), name='sign-in'),
    path('login/', LoginPageView.as_view(), name='login-direct'),
    path('accounts/register/', RegisterPageView.as_view(), name='create-account'),
    path('register/', RegisterPageView.as_view(), name='register-direct'),
    path('accounts/session/', spa_view, name='account-menu'),
    # Protected custom admin path instead of standard /admin/
    path('secret-management/', admin.site.urls),
    # Conceal standard admin path with 404
    path('admin/', admin_hidden_404),
    path('admin/<path:subpath>', admin_hidden_404),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/auth/', include('accounts.urls')),
    path('api/components/', include('components.urls')),
    path('api/builder/', include('builder.urls')),
    path('api/marketplace/', include('marketplace.urls')),
    path('api/chat/', include('chat.urls')),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
