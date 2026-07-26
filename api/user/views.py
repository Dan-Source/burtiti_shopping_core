from __future__ import annotations

from drf_spectacular.utils import OpenApiResponse, extend_schema
from oscar.core.loading import get_model
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.basket.serializers import ContractErrorSerializer
from api.basket.services import map_brazil_address_to_oscar, serialize_oscar_address_to_brazil
from api.basket.views import ContractAPIView
from api.user.serializers import BrazilianAddressInputSerializer

Country = get_model("address", "Country")
UserAddress = get_model("address", "UserAddress")


class UserAddressListView(ContractAPIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="listUserAddresses",
        summary="Listar enderecos do usuario",
        tags=["Usuário"],
        responses={200: OpenApiResponse(description="Lista de enderecos")},
    )
    def get(self, request):
        addresses = UserAddress.objects.filter(user=request.user).order_by("-date_created")
        data = [serialize_oscar_address_to_brazil(addr) for addr in addresses]
        return Response(data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="createUserAddress",
        summary="Criar novo endereco",
        tags=["Usuário"],
        request=BrazilianAddressInputSerializer,
        responses={
            201: OpenApiResponse(description="Endereco criado"),
            400: OpenApiResponse(response=ContractErrorSerializer, description="Erro de validacao"),
        },
    )
    def post(self, request):
        serializer = BrazilianAddressInputSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))
            detail = first_error[0] if isinstance(first_error, list) else str(first_error)
            return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            oscar_data = serializer.to_oscar_data()
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        country = Country.objects.filter(iso_3166_1_a2="BR").first()
        if country is None:
            country, _ = Country.objects.get_or_create(
                iso_3166_1_a2="BR",
                defaults={
                    "iso_3166_1_a3": "BRA",
                    "iso_3166_1_numeric": "076",
                    "printable_name": "Brasil",
                    "name": "Brazil",
                    "display_order": 1,
                    "is_shipping_country": True,
                },
            )

        address = UserAddress.objects.create(
            user=request.user,
            title="",
            country=country,
            **oscar_data,
        )

        return Response(
            serialize_oscar_address_to_brazil(address),
            status=status.HTTP_201_CREATED,
        )


class UserAddressDetailView(ContractAPIView):
    permission_classes = (IsAuthenticated,)

    def _get_address(self, request, address_id: int):
        address = UserAddress.objects.filter(id=address_id, user=request.user).first()
        if address is None:
            return None
        return address

    @extend_schema(
        operation_id="updateUserAddress",
        summary="Atualizar endereco",
        tags=["Usuário"],
        request=BrazilianAddressInputSerializer,
        responses={
            200: OpenApiResponse(description="Endereco atualizado"),
            400: OpenApiResponse(response=ContractErrorSerializer, description="Erro de validacao"),
            404: OpenApiResponse(description="Endereco nao encontrado"),
        },
    )
    def put(self, request, address_id: int):
        address = self._get_address(request, address_id)
        if address is None:
            return Response({"detail": "Endereco nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

        serializer = BrazilianAddressInputSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))
            detail = first_error[0] if isinstance(first_error, list) else str(first_error)
            return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            oscar_data = map_brazil_address_to_oscar(
                {**request.data, "phone": request.data.get("phone", ""),
                 "complement": request.data.get("complement", "")}
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        for field, value in oscar_data.items():
            setattr(address, field, value)
        address.save()

        return Response(
            serialize_oscar_address_to_brazil(address),
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        operation_id="deleteUserAddress",
        summary="Remover endereco",
        tags=["Usuário"],
        responses={
            204: OpenApiResponse(description="Endereco removido"),
            404: OpenApiResponse(description="Endereco nao encontrado"),
        },
    )
    def delete(self, request, address_id: int):
        address = self._get_address(request, address_id)
        if address is None:
            return Response({"detail": "Endereco nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserAddressCountView(ContractAPIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="countUserAddresses",
        summary="Contar enderecos do usuario",
        tags=["Usuário"],
        responses={200: OpenApiResponse(description="Quantidade de enderecos")},
    )
    def get(self, request):
        count = UserAddress.objects.filter(user=request.user).count()
        return Response({"count": count}, status=status.HTTP_200_OK)
