from __future__ import annotations

from typing import Any

from django.shortcuts import get_object_or_404
from django.utils.translation import gettext as _
from django.utils.module_loading import import_string
from drf_spectacular.utils import OpenApiResponse, extend_schema
from oscar.core.loading import get_class, get_model
from oscarapi.basket import operations
from oscarapi.serializers.basket import VoucherAddSerializer
from oscarapi.serializers.checkout import CheckoutSerializer as OscarCheckoutSerializer
from rest_framework.authentication import SessionAuthentication
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from api.basket.serializers import (
    AddProductRequestSerializer,
    AddVoucherRequestSerializer,
    CheckoutPaymentMethodSerializer,
    CheckoutPayloadSerializer,
    ContractErrorSerializer,
    OrderSerializer,
    ShippingMethodSerializer,
    UpdateBasketLineRequestSerializer,
    build_basket_hyperlink,
    decimal_to_string,
    serialize_cart,
)
from api.checkout.models import PixTransaction
from api.checkout.payment_methods import mark_pix_as_paid
from api.checkout.services import get_enabled_payment_methods, get_payment_method_by_code

Product = get_model("catalogue", "Product")
Line = get_model("basket", "Line")
Country = get_model("address", "Country")
UserAddress = get_model("address", "UserAddress")
ShippingAddress = get_model("order", "ShippingAddress")
BillingAddress = get_model("order", "BillingAddress")
Repository = get_class("shipping.repository", "Repository")
Order = get_model("order", "Order")


class BasketContractErrorMixin:
    def error(self, detail: str, code: int = status.HTTP_400_BAD_REQUEST) -> Response:
        return Response({"detail": detail}, status=code)


class ContractAPIView(APIView):
    authentication_classes = (SessionAuthentication, JWTAuthentication)
    permission_classes = (AllowAny,)


class BasketView(ContractAPIView):
    @extend_schema(
        operation_id="getBasket",
        summary="Meu carrinho",
        tags=["Carrinho"],
        responses={200: OpenApiResponse(description="Dados do carrinho")},
    )
    def get(self, request):
        basket = operations.get_basket(request)
        return Response(serialize_cart(basket, request), status=status.HTTP_200_OK)


class AddProductView(BasketContractErrorMixin, ContractAPIView):
    def _validate_addition(self, basket, product, quantity):
        availability = basket.strategy.fetch_for_product(product).availability

        if not availability.is_available_to_buy:
            return False, str(availability.message)

        current_qty = basket.product_quantity(product)
        desired_qty = current_qty + quantity

        allowed, message = availability.is_purchase_permitted(desired_qty)
        if not allowed:
            return False, str(message)

        allowed, message = basket.is_quantity_allowed(desired_qty)
        if not allowed:
            return False, str(message)

        return True, None

    @extend_schema(
        operation_id="addToBasket",
        summary="Adicionar ao carrinho",
        tags=["Carrinho"],
        request=AddProductRequestSerializer,
        responses={
            200: OpenApiResponse(description="Carrinho atualizado"),
            400: OpenApiResponse(response=ContractErrorSerializer, description="Produto nao encontrado ou sem estoque"),
        },
    )
    def post(self, request):
        serializer = AddProductRequestSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))
            detail = first_error[0] if isinstance(first_error, list) else str(first_error)
            return self.error(str(detail))

        product_id = serializer.validated_data["product_id"]
        quantity = serializer.validated_data["quantity"]

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return self.error("Produto nao encontrado.")

        basket = operations.get_basket(request)
        is_valid, message = self._validate_addition(basket, product, quantity)
        if not is_valid:
            return self.error(message or "Nao foi possivel adicionar o item ao carrinho.")

        try:
            basket.add_product(product, quantity=quantity, options=[])
        except ValueError as exc:
            return self.error(str(exc))

        operations.apply_offers(request, basket)
        return Response(serialize_cart(basket, request), status=status.HTTP_200_OK)


class AddVoucherView(BasketContractErrorMixin, ContractAPIView):
    @extend_schema(
        operation_id="addVoucher",
        summary="Adicionar cupom",
        tags=["Carrinho"],
        request=AddVoucherRequestSerializer,
        responses={
            200: OpenApiResponse(description="Cupom aplicado"),
            400: OpenApiResponse(response=ContractErrorSerializer, description="Cupom invalido ou expirado"),
        },
    )
    def post(self, request):
        serializer = AddVoucherRequestSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))
            detail = first_error[0] if isinstance(first_error, list) else str(first_error)
            return self.error(str(detail))

        voucher_code = serializer.validated_data["voucher"]
        voucher_serializer = VoucherAddSerializer(
            data={"vouchercode": voucher_code}, context={"request": request}
        )
        if not voucher_serializer.is_valid():
            first_error = next(iter(voucher_serializer.errors.values()))
            detail = first_error[0] if isinstance(first_error, list) else str(first_error)
            return self.error(str(detail))

        basket = operations.get_basket(request)
        voucher = voucher_serializer.instance
        basket.vouchers.add(voucher)

        operations.apply_offers(request, basket)
        discounts_after = basket.offer_applications

        for discount in discounts_after:
            if discount["voucher"] and discount["voucher"] == voucher:
                return Response(serialize_cart(basket, request), status=status.HTTP_200_OK)

        basket.vouchers.remove(voucher)
        return self.error(str(_("Seu carrinho nao se qualifica para este cupom.")))


class ShippingMethodsView(ContractAPIView):
    @extend_schema(
        operation_id="getShippingMethods",
        summary="Metodos de entrega",
        tags=["Carrinho"],
        responses={200: OpenApiResponse(description="Metodos de frete disponiveis")},
    )
    def get(self, request):
        basket = operations.get_basket(request)
        methods = Repository().get_shipping_methods(
            basket=basket,
            user=request.user,
            shipping_addr=None,
            request=request,
        )

        payload: list[dict[str, Any]] = []
        for method in methods:
            price = method.calculate(basket)
            payload.append(
                {
                    "code": method.code,
                    "name": method.name,
                    "price_incl_tax": decimal_to_string(getattr(price, "incl_tax", None)),
                }
            )

        return Response(ShippingMethodSerializer(payload, many=True).data, status=status.HTTP_200_OK)


class BasketLineDetailView(BasketContractErrorMixin, ContractAPIView):
    def _get_line(self, request, line_id: int):
        basket = operations.get_basket(request)
        line = basket.all_lines().filter(id=line_id).first()
        return basket, line

    @extend_schema(
        operation_id="updateBasketLine",
        summary="Atualizar item do carrinho",
        tags=["Carrinho"],
        request=UpdateBasketLineRequestSerializer,
        responses={200: OpenApiResponse(description="Carrinho atualizado")},
    )
    def patch(self, request, line_id: int):
        serializer = UpdateBasketLineRequestSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))
            detail = first_error[0] if isinstance(first_error, list) else str(first_error)
            return self.error(str(detail))

        basket, line = self._get_line(request, line_id)
        if line is None:
            return self.error("Item do carrinho nao encontrado.")

        quantity = serializer.validated_data["quantity"]
        if quantity == 0:
            line.delete()
            operations.apply_offers(request, basket)
            return Response(serialize_cart(basket, request), status=status.HTTP_200_OK)

        is_allowed, message = basket.is_quantity_allowed(quantity, line=line)
        if not is_allowed:
            return self.error(str(message))

        line.quantity = quantity
        line.save(update_fields=["quantity"])

        operations.apply_offers(request, basket)
        return Response(serialize_cart(basket, request), status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="removeBasketLine",
        summary="Remover item do carrinho",
        tags=["Carrinho"],
        responses={200: OpenApiResponse(description="Item removido")},
    )
    def delete(self, request, line_id: int):
        basket, line = self._get_line(request, line_id)
        if line is None:
            return self.error("Item do carrinho nao encontrado.")

        line.delete()
        operations.apply_offers(request, basket)
        return Response({"success": True}, status=status.HTTP_200_OK)


class CheckoutPaymentMethodsView(ContractAPIView):
    @extend_schema(
        operation_id="getCheckoutPaymentMethods",
        summary="Metodos de pagamento do checkout",
        tags=["Pedidos"],
        responses={200: OpenApiResponse(description="Metodos de pagamento disponiveis")},
    )
    def get(self, request):
        methods = get_enabled_payment_methods()
        payload = [
            {
                "code": method["code"],
                "name": method.get("name"),
                "label": method.get("label"),
                "description": method.get("description"),
            }
            for method in methods
        ]
        serializer = CheckoutPaymentMethodSerializer(payload, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CheckoutView(BasketContractErrorMixin, ContractAPIView):
    def _country_url(self, request, payload: dict[str, Any]) -> str | None:
        country_value = payload.get("country")
        if isinstance(country_value, str) and country_value.startswith("http"):
            return country_value

        country = None
        if isinstance(country_value, str) and len(country_value) == 2:
            country = Country.objects.filter(iso_3166_1_a2=country_value.upper()).first()
        if country is None:
            country = Country.objects.filter(iso_3166_1_a2="BR").first() or Country.objects.filter(
                is_shipping_country=True
            ).first()
        if country is None:
            return None

        return request.build_absolute_uri(f"/api/countries/{country.iso_3166_1_a2}/")

    def _serialize_address_from_user_address(self, request, user_address: Any) -> dict[str, Any]:
        country_url = request.build_absolute_uri(f"/api/countries/{user_address.country.iso_3166_1_a2}/")
        return {
            "title": user_address.title,
            "first_name": user_address.first_name,
            "last_name": user_address.last_name,
            "line1": user_address.line1,
            "line2": user_address.line2,
            "line3": user_address.line3,
            "line4": user_address.line4,
            "state": user_address.state,
            "postcode": user_address.postcode,
            "country": country_url,
            "phone_number": user_address.phone_number,
            "notes": user_address.notes,
        }

    def _build_checkout_address(self, request, raw_address: Any, model_cls):
        if raw_address is None:
            return None

        if isinstance(raw_address, int):
            if not request.user.is_authenticated:
                raise ValueError("Endereco salvo so pode ser usado por usuario autenticado.")

            user_address = UserAddress.objects.filter(id=raw_address, user=request.user).first()
            if user_address is None:
                raise ValueError("Endereco informado nao foi encontrado.")
            return self._serialize_address_from_user_address(request, user_address)

        if not isinstance(raw_address, dict):
            raise ValueError("Endereco invalido.")

        allowed_fields = {field.name for field in model_cls._meta.fields}
        address_payload = {key: value for key, value in raw_address.items() if key in allowed_fields}
        country_url = self._country_url(request, raw_address)
        if country_url:
            address_payload["country"] = country_url

        return address_payload

    @extend_schema(
        operation_id="checkout",
        summary="Finalizar compra",
        tags=["Pedidos"],
        request=CheckoutPayloadSerializer,
        responses={
            201: OpenApiResponse(description="Pedido criado"),
            400: OpenApiResponse(response=ContractErrorSerializer, description="Erro de validacao"),
        },
    )
    def post(self, request):
        serializer = CheckoutPayloadSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))
            detail = first_error[0] if isinstance(first_error, list) else str(first_error)
            return self.error(str(detail))

        basket = operations.get_basket(request)
        if basket.num_items <= 0:
            return self.error("Carrinho vazio.")

        data = serializer.validated_data
        payment_method_code = data.get("payment_method_code")

        enabled_methods = get_enabled_payment_methods()
        if not enabled_methods:
            return self.error("Nenhum metodo de pagamento esta habilitado para o checkout.")

        if not payment_method_code:
            payment_method_code = enabled_methods[0]["code"]

        payment_method_config = get_payment_method_by_code(payment_method_code)
        if payment_method_config is None:
            return self.error("Metodo de pagamento invalido ou indisponivel.")

        try:
            shipping_address = self._build_checkout_address(
                request, data.get("shipping_address"), ShippingAddress
            )
            billing_address = self._build_checkout_address(request, data.get("billing_address"), BillingAddress)
        except ValueError as exc:
            return self.error(str(exc))

        checkout_payload: dict[str, Any] = {
            "basket": build_basket_hyperlink(request, basket.id),
        }

        shipping_method_code = data.get("shipping_method_code")
        if not shipping_method_code:
            default_method = Repository().get_default_shipping_method(
                basket=basket,
                user=request.user,
                request=request,
                shipping_addr=None,
            )
            shipping_method_code = getattr(default_method, "code", None)
        if shipping_method_code:
            checkout_payload["shipping_method_code"] = shipping_method_code

        if shipping_address:
            checkout_payload["shipping_address"] = shipping_address

        if billing_address:
            checkout_payload["billing_address"] = billing_address

        guest_email = data.get("guest_email")
        if guest_email:
            checkout_payload["guest_email"] = guest_email

        checkout_serializer = OscarCheckoutSerializer(data=checkout_payload, context={"request": request})
        if not checkout_serializer.is_valid():
            first_error = next(iter(checkout_serializer.errors.values()))
            detail = first_error[0] if isinstance(first_error, list) else str(first_error)
            return self.error(str(detail))

        try:
            order = checkout_serializer.save()
        except Exception as exc:  # pragma: no cover
            return self.error(str(exc))

        try:
            handler_cls = import_string(payment_method_config["handler"])
            payment_result = handler_cls().process(request=request, basket=basket, order=order)
        except Exception as exc:
            return self.error(f"Falha ao processar pagamento: {exc}")

        basket.freeze()

        response_payload = OrderSerializer(order, context={"request": request}).data
        response_payload["payment_status"] = payment_result.payment_status
        return Response(response_payload, status=status.HTTP_201_CREATED)


class PixStatusView(BasketContractErrorMixin, ContractAPIView):
    @extend_schema(
        operation_id="getPixPaymentStatus",
        summary="Consultar status do pagamento PIX",
        tags=["Pedidos"],
        responses={
            200: OpenApiResponse(description="Status atualizado do PIX"),
            404: OpenApiResponse(response=ContractErrorSerializer, description="Pedido nao encontrado"),
        },
    )
    def get(self, request, order_id: int):
        order = get_object_or_404(Order, id=order_id)
        if not request.user.is_staff and order.user_id != getattr(request.user, "id", None):
            return self.error("Pedido nao encontrado.", code=status.HTTP_404_NOT_FOUND)

        transaction = getattr(order, "pix_transaction", None)
        if transaction is None:
            return self.error("Transacao PIX nao encontrada para este pedido.", code=status.HTTP_404_NOT_FOUND)

        payment_method_config = get_payment_method_by_code("pix")
        if payment_method_config is None:
            return self.error("Metodo PIX nao esta habilitado.", code=status.HTTP_400_BAD_REQUEST)

        try:
            handler_cls = import_string(payment_method_config["handler"])
            gateway = handler_cls()._get_gateway()
            gateway_result = gateway.get_status(transaction)
        except Exception as exc:
            return self.error(f"Falha ao consultar status PIX: {exc}")

        transaction.status = gateway_result.get("status", PixTransaction.STATUS_PENDING)
        transaction.raw_response = {
            **(transaction.raw_response or {}),
            **(gateway_result.get("raw_response") or {}),
        }
        transaction.save(update_fields=["status", "raw_response", "updated_at"])

        if transaction.status == PixTransaction.STATUS_PAID:
            mark_pix_as_paid(order, transaction)

        payload = OrderSerializer(order, context={"request": request}).data
        return Response(payload, status=status.HTTP_200_OK)
