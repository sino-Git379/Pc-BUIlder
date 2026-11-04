from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from .page_views import MarketplacePage, ComponentsPage, ComponentPickerPage, BuildsPage, BuilderPage, ListingDetailPage

spa_view = TemplateView.as_view(template_name='spa_index.html')

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
    path('accounts/login/', spa_view, name='sign-in'),
    path('accounts/register/', spa_view, name='create-account'),
    path('accounts/session/', spa_view, name='account-menu'),
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/auth/', include('accounts.urls')),
    path('api/components/', include('components.urls')),
    path('api/builder/', include('builder.urls')),
    path('api/marketplace/', include('marketplace.urls')),
    path('api/chat/', include('chat.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
