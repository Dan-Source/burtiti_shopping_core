from django.apps import AppConfig


class CheckoutApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api.checkout"
    label = "api_checkout"
    verbose_name = "Checkout API"
