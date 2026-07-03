from django.urls import path

from api.basket.views import (
    AddProductView,
    AddVoucherView,
    BasketLineDetailView,
    BasketView,
    CheckoutView,
    CheckoutPaymentMethodsView,
    PixStatusView,
    ShippingMethodsView,
)
from api.products.views import CategoryTreeListAPIView, ProductDetailAPIView, ProductListAPIView

urlpatterns = [
    path("basket/", BasketView.as_view(), name="api-basket"),
    path("basket/add-product/", AddProductView.as_view(), name="api-basket-add-product"),
    path("basket/add-voucher/", AddVoucherView.as_view(), name="api-basket-add-voucher"),
    path("basket/shipping-methods/", ShippingMethodsView.as_view(), name="api-basket-shipping-methods"),
    path("basket/lines/<int:line_id>/", BasketLineDetailView.as_view(), name="api-current-basket-line-detail"),
    path("checkout/", CheckoutView.as_view(), name="api-checkout"),
    path("checkout/payment-methods/", CheckoutPaymentMethodsView.as_view(), name="api-checkout-payment-methods"),
    path("checkout/pix/status/<int:order_id>/", PixStatusView.as_view(), name="api-checkout-pix-status"),
    path("products/", ProductListAPIView.as_view(), name="api-product-list"),
    path("products/<int:id>/", ProductDetailAPIView.as_view(), name="api-product-detail"),
    path("categories/", CategoryTreeListAPIView.as_view(), name="api-category-list"),
]
