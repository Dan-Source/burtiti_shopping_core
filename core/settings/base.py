"""
Django base settings for core project.
This file contains settings common to all environments.
"""

import os
import importlib.util
from pathlib import Path
from datetime import timedelta

from oscar.defaults import *

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# base.py lives in core/settings/, so parent.parent.parent is the project root.
BASE_DIR = Path(__file__).resolve().parent.parent.parent


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', "django-insecure-gsm_(wf58@f8@-8##&qkw_5$4dj+^-xtit@c_uxb0-%r0f1vp-")

# SECURITY WARNING: don't run with debug turned on in production!
# Default to False here; development.py enables DEBUG.
DEBUG = False

ALLOWED_HOSTS = []


# Application definition

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "django.contrib.flatpages",
]

DJANGO_OSCAR_APPS = [
    "oscar.config.Shop",
    "oscar.apps.analytics.apps.AnalyticsConfig",
    "oscar.apps.checkout.apps.CheckoutConfig",
    "oscar.apps.address.apps.AddressConfig",
    "oscar.apps.shipping.apps.ShippingConfig",
    "oscar.apps.catalogue.apps.CatalogueConfig",
    "oscar.apps.catalogue.reviews.apps.CatalogueReviewsConfig",
    "oscar.apps.communication.apps.CommunicationConfig",
    "oscar.apps.partner.apps.PartnerConfig",
    "oscar.apps.basket.apps.BasketConfig",
    "oscar.apps.payment.apps.PaymentConfig",
    "oscar.apps.offer.apps.OfferConfig",
    "oscar.apps.order.apps.OrderConfig",
    "oscar.apps.customer.apps.CustomerConfig",
    "oscar.apps.search.apps.SearchConfig",
    "oscar.apps.voucher.apps.VoucherConfig",
    "oscar.apps.wishlists.apps.WishlistsConfig",
    "oscar.apps.dashboard.apps.DashboardConfig",
    "oscar.apps.dashboard.reports.apps.ReportsDashboardConfig",
    "oscar.apps.dashboard.users.apps.UsersDashboardConfig",
    "oscar.apps.dashboard.orders.apps.OrdersDashboardConfig",
    "oscar.apps.dashboard.catalogue.apps.CatalogueDashboardConfig",
    "oscar.apps.dashboard.offers.apps.OffersDashboardConfig",
    "oscar.apps.dashboard.partners.apps.PartnersDashboardConfig",
    "oscar.apps.dashboard.pages.apps.PagesDashboardConfig",
    "oscar.apps.dashboard.ranges.apps.RangesDashboardConfig",
    "oscar.apps.dashboard.reviews.apps.ReviewsDashboardConfig",
    "oscar.apps.dashboard.vouchers.apps.VouchersDashboardConfig",
    "oscar.apps.dashboard.communications.apps.CommunicationsDashboardConfig",
    "oscar.apps.dashboard.shipping.apps.ShippingDashboardConfig",
]

THIRD_PARTY_APPS = [
    "widget_tweaks",
    "haystack",
    "treebeard",
    "sorl.thumbnail",  # Default thumbnail backend, can be replaced
    "django_tables2",
    "compressor",
    "oscarapi",
    "rest_framework",
    "rest_framework_simplejwt",
    "drf_spectacular",
]

if importlib.util.find_spec("oscarapicheckout"):
    THIRD_PARTY_APPS.append("oscarapicheckout")

PROJECT_APPS = [
    "api.checkout",
]

INSTALLED_APPS = DJANGO_APPS + DJANGO_OSCAR_APPS + THIRD_PARTY_APPS + PROJECT_APPS

SITE_ID = 1

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "oscar.apps.basket.middleware.BasketMiddleware",
    "django.contrib.flatpages.middleware.FlatpageFallbackMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "oscar.apps.search.context_processors.search_form",
                "oscar.apps.checkout.context_processors.checkout",
                "oscar.apps.communication.notifications.context_processors.notifications",
                "oscar.core.context_processors.metadata",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# Always use PostgreSQL across environments (including tests).
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "buriti"),
        "USER": os.getenv("POSTGRES_USER", "buriti"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "buriti"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTHENTICATION_BACKENDS = (
    "oscar.apps.customer.auth_backends.EmailBackend",
    "django.contrib.auth.backends.ModelBackend",
)

HAYSTACK_CONNECTIONS = {
    "default": {
        "ENGINE": "haystack.backends.whoosh_backend.WhooshEngine",
        "PATH": BASE_DIR / "whoosh_index",
    },
}

# Frontend asset compression and SCSS preprocessing
# Keep compressor output in STATIC_ROOT so /static/CACHE files are actually served.
COMPRESS_ROOT = STATIC_ROOT
COMPRESS_URL = STATIC_URL
COMPRESS_ENABLED = True
COMPRESS_PRECOMPILERS = (
    ("text/x-scss", "django_libsass.SassCompiler"),
)

STATICFILES_FINDERS = (
    "django.contrib.staticfiles.finders.FileSystemFinder",
    "django.contrib.staticfiles.finders.AppDirectoriesFinder",
    "compressor.finders.CompressorFinder",
)

OSCAR_CURRENCY_FORMAT = {
    "BRL": {
        "format": "¤\xa0#,##0.00",
    }
}


EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.TokenAuthentication",
    ],
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Buriti Shopping - API de Catalogo",
    "DESCRIPTION": (
        "API REST de produtos, categorias e busca. Segue o padrao django-oscar com "
        "paginacao, filtros e ordenacao via query params."
    ),
    "VERSION": "1.0.0",
    "CONTACT": {
        "name": "Equipe Buriti Shopping",
    },
    "SERVERS": [
        {"url": "http://0.0.0.0:8000", "description": "Desenvolvimento local"},
        {"url": "https://api.buritishopping.com.br", "description": "Producao"},
    ],
}

# Keep API registration disabled by default. Enable explicitly by env var,
# or override in development settings.
OSCARAPI_ENABLE_REGISTRATION = (
    os.getenv("OSCARAPI_ENABLE_REGISTRATION", "False").lower() == "true"
)

CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]


CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "x-csrf-token",
    "x-request-source",
    "X-Csrftoken",
    "x-csrftoken",
    "X-CSRFTOKEN",
]

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

# Checkout status pipeline for asynchronous payment flows like PIX.
OSCAR_INITIAL_ORDER_STATUS = os.getenv("OSCAR_INITIAL_ORDER_STATUS", "Pending")
OSCAR_ORDER_STATUS_PIPELINE = {
    "Pending": ("Payment Declined", "Authorized", "Cancelled"),
    "Payment Declined": ("Pending", "Cancelled"),
    "Authorized": ("Being processed", "Cancelled"),
    "Being processed": ("Complete", "Cancelled"),
    "Complete": (),
    "Cancelled": (),
}

# Supported checkout payment methods exposed by the API.
API_ENABLED_PAYMENT_METHODS = [
    {
        "code": "pix",
        "name": "PIX",
        "label": "Pagar com PIX",
        "description": "Pagamento instantaneo por QR Code",
        "handler": "api.checkout.payment_methods.PixPaymentMethod",
    },
    {
        "code": "cash_on_delivery",
        "name": "Pagamento na Entrega",
        "label": "Pagar na entrega",
        "description": "Pedido confirmado e pagamento realizado no recebimento",
        "handler": "api.checkout.payment_methods.CashOnDeliveryPaymentMethod",
    },
]

PIX_GATEWAY_BACKEND = os.getenv("PIX_GATEWAY_BACKEND", "api.checkout.gateway.MockPixGateway")
PIX_EXPIRATION_MINUTES = int(os.getenv("PIX_EXPIRATION_MINUTES", "30"))