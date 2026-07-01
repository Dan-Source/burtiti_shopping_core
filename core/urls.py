"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.apps import apps
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


from core.views import (
    CurrentBasketLineDetailView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    UserMeView,
    csrf_token_view,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("shop.store.urls")),
    path("", include(apps.get_app_config("oscar").urls[0])),
    path("api/", include("api.urls")),
    path("api/", include("oscarapi.urls")),
    path("api/users/me/", UserMeView.as_view(), name="api-user-me"),
    path("api/password-reset/", PasswordResetRequestView.as_view(), name="api-password-reset"),
    path(
        "api/password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="api-password-reset-confirm",
    ),
    path(
        "api/basket/lines/<int:pk>/",
        CurrentBasketLineDetailView.as_view(),
        name="api-current-basket-line-detail",
    ),
    path("api/csrf/", csrf_token_view, name="api-csrf"),
    path("api/schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="api-schema"), name="api-docs"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="api-schema"), name="api-redoc"),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)