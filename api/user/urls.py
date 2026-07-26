from django.urls import path

from api.user.views import UserAddressCountView, UserAddressDetailView, UserAddressListView

urlpatterns = [
    path("addresses/", UserAddressListView.as_view(), name="api-user-addresses"),
    path("addresses/count/", UserAddressCountView.as_view(), name="api-user-addresses-count"),
    path("addresses/<int:address_id>/", UserAddressDetailView.as_view(), name="api-user-address-detail"),
]
