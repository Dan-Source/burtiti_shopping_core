from django.urls import path

from api.products.views import CategoryTreeListAPIView, ProductDetailAPIView, ProductListAPIView

urlpatterns = [
    path("products/", ProductListAPIView.as_view(), name="api-product-list"),
    path("products/<int:id>/", ProductDetailAPIView.as_view(), name="api-product-detail"),
    path("categories/", CategoryTreeListAPIView.as_view(), name="api-category-list"),
]
