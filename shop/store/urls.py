from django.urls import path

from shop.store import views

urlpatterns = [
    path("cart/", views.cart_detail, name="cart-detail"),
    path("cart/add/<slug:slug>/", views.cart_add, name="cart-add"),
    path("cart/update/<slug:slug>/", views.cart_update, name="cart-update"),
]
