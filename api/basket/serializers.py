from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db.models import Sum
from django.urls import reverse
from oscar.core.loading import get_model
from rest_framework import serializers

Product = get_model("catalogue", "Product")


def decimal_to_string(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return f"{value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}"


class ContractErrorSerializer(serializers.Serializer):
    detail = serializers.CharField()


class PriceSerializer(serializers.Serializer):
    currency = serializers.CharField(min_length=3, max_length=12)
    excl_tax = serializers.CharField(allow_null=True)
    incl_tax = serializers.CharField(allow_null=True)


class ProductItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField(allow_null=True)
    name = serializers.SerializerMethodField()
    slug = serializers.CharField()
    image = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    is_on_sale = serializers.SerializerMethodField()

    def get_name(self, obj: Any) -> str:
        return obj.title

    def get_image(self, obj: Any) -> str | None:
        request = self.context.get("request")
        image = obj.images.order_by("display_order").first()
        if not image or not image.original:
            return None
        if request:
            return request.build_absolute_uri(image.original.url)
        return image.original.url

    def get_price(self, obj: Any) -> dict[str, Any] | None:
        line = self.context.get("line")
        price_info = getattr(getattr(line, "purchase_info", None), "price", None)

        if price_info and getattr(price_info, "exists", False):
            currency = price_info.currency
            excl_tax = decimal_to_string(price_info.excl_tax)
            incl_tax = decimal_to_string(getattr(price_info, "incl_tax", None))
            return {
                "currency": currency,
                "excl_tax": excl_tax,
                "incl_tax": incl_tax,
            }

        stockrecord = obj.stockrecords.order_by("price").first()
        if not stockrecord or stockrecord.price is None:
            return None

        return {
            "currency": stockrecord.price_currency,
            "excl_tax": decimal_to_string(stockrecord.price),
            "incl_tax": decimal_to_string(stockrecord.price),
        }

    def get_stock(self, obj: Any) -> int:
        total_stock = obj.stockrecords.aggregate(total=Sum("num_in_stock")).get("total")
        return max(int(total_stock or 0), 0)

    def get_is_on_sale(self, obj: Any) -> bool:
        line = self.context.get("line")
        if line is None:
            return False

        raw_total = getattr(line, "line_price_excl_tax", None)
        discounted_total = getattr(line, "line_price_excl_tax_incl_discounts", None)

        if raw_total is None or discounted_total is None:
            return False
        return discounted_total < raw_total


class CartLineSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    product = serializers.SerializerMethodField()
    quantity = serializers.IntegerField(min_value=0)
    price_incl_tax = serializers.SerializerMethodField()
    price_excl_tax = serializers.SerializerMethodField()

    def get_product(self, obj: Any) -> dict[str, Any]:
        serializer = ProductItemSerializer(obj.product, context={"request": self.context.get("request"), "line": obj})
        return serializer.data

    def get_price_incl_tax(self, obj: Any) -> str | None:
        value = getattr(obj, "line_price_incl_tax_incl_discounts", None)
        return decimal_to_string(value)

    def get_price_excl_tax(self, obj: Any) -> str | None:
        value = getattr(obj, "line_price_excl_tax_incl_discounts", None)
        return decimal_to_string(value)


class CartSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    owner = serializers.SerializerMethodField()
    total_incl_tax = serializers.SerializerMethodField()
    total_excl_tax = serializers.SerializerMethodField()
    lines = CartLineSerializer(many=True)

    def get_owner(self, obj: Any) -> int | None:
        if isinstance(obj, dict):
            return obj.get("owner")
        return obj.owner_id

    def get_total_incl_tax(self, obj: Any) -> str | None:
        if isinstance(obj, dict):
            return decimal_to_string(obj.get("total_incl_tax"))
        return decimal_to_string(getattr(obj, "total_incl_tax", None))

    def get_total_excl_tax(self, obj: Any) -> str | None:
        if isinstance(obj, dict):
            return decimal_to_string(obj.get("total_excl_tax"))
        return decimal_to_string(getattr(obj, "total_excl_tax", None))


class AddProductRequestSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    options = serializers.JSONField(required=False)


class AddVoucherRequestSerializer(serializers.Serializer):
    voucher = serializers.CharField(max_length=128)


class UpdateBasketLineRequestSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=0)


class ShippingMethodSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    price_incl_tax = serializers.CharField(allow_null=True)


class CheckoutPaymentMethodSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField(allow_blank=True, allow_null=True)
    label = serializers.CharField(allow_blank=True, allow_null=True)
    description = serializers.CharField(allow_blank=True, allow_null=True)


class CheckoutAddressSerializer(serializers.Serializer):
    full_name = serializers.CharField(required=False)
    cep = serializers.CharField(required=False)
    street = serializers.CharField(required=False)
    number = serializers.CharField(required=False)
    bairro = serializers.CharField(required=False)
    city = serializers.CharField(required=False)
    state = serializers.CharField(required=False)
    complement = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)


class CheckoutPayloadSerializer(serializers.Serializer):
    shipping_address = serializers.JSONField(required=False)
    billing_address = serializers.JSONField(required=False)
    shipping_method_code = serializers.CharField(required=False, allow_blank=False)
    payment_method_code = serializers.CharField(required=False, allow_blank=False)
    guest_email = serializers.EmailField(required=False, allow_null=True)

    def _validate_address_dict(self, address: dict | int | None):
        if address is None:
            return
        if isinstance(address, int):
            if address <= 0:
                raise serializers.ValidationError("ID de endereco invalido.")
            return
        if isinstance(address, dict):
            serializer = CheckoutAddressSerializer(data=address)
            if not serializer.is_valid():
                first_error = next(iter(serializer.errors.values()))
                detail = first_error[0] if isinstance(first_error, list) else str(first_error)
                raise serializers.ValidationError(str(detail))

    def validate_shipping_address(self, value):
        self._validate_address_dict(value)
        return value

    def validate_billing_address(self, value):
        self._validate_address_dict(value)
        return value


class OrderLineSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    product = serializers.SerializerMethodField()
    quantity = serializers.IntegerField(min_value=1)
    line_price_incl_tax = serializers.SerializerMethodField()

    def get_product(self, obj: Any) -> dict[str, Any]:
        serializer = ProductItemSerializer(obj.product, context={"request": self.context.get("request")})
        return serializer.data

    def get_line_price_incl_tax(self, obj: Any) -> str | None:
        return decimal_to_string(getattr(obj, "line_price_incl_tax", None))


class OrderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    number = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    payment_status = serializers.SerializerMethodField()
    date_placed = serializers.DateTimeField(allow_null=True)
    total_incl_tax = serializers.SerializerMethodField()
    pix_qr_code_image = serializers.SerializerMethodField()
    pix_qr_code = serializers.SerializerMethodField()
    pix_copy_paste = serializers.SerializerMethodField()
    pix_expires_at = serializers.SerializerMethodField()
    lines = serializers.SerializerMethodField()

    def get_payment_status(self, obj: Any) -> str | None:
        transaction = getattr(obj, "pix_transaction", None)
        if transaction is not None:
            return transaction.status

        normalized_status = (getattr(obj, "status", "") or "").lower()
        if normalized_status == "authorized":
            return "paid"
        if normalized_status in {"pending", "payment declined"}:
            return "pending"
        return None

    def get_total_incl_tax(self, obj: Any) -> str | None:
        return decimal_to_string(getattr(obj, "total_incl_tax", None))

    def get_pix_qr_code_image(self, obj: Any) -> str | None:
        transaction = getattr(obj, "pix_transaction", None)
        if transaction is None:
            return None
        return transaction.qr_code_image or None

    def get_pix_qr_code(self, obj: Any) -> str | None:
        transaction = getattr(obj, "pix_transaction", None)
        if transaction is None:
            return None
        return transaction.qr_code_payload or None

    def get_pix_copy_paste(self, obj: Any) -> str | None:
        transaction = getattr(obj, "pix_transaction", None)
        if transaction is None:
            return None
        return transaction.copy_paste or None

    def get_pix_expires_at(self, obj: Any):
        transaction = getattr(obj, "pix_transaction", None)
        if transaction is None:
            return None
        return transaction.expires_at

    def get_lines(self, obj: Any) -> list[dict[str, Any]]:
        lines = obj.lines.select_related("product").all()
        serializer = OrderLineSerializer(lines, many=True, context={"request": self.context.get("request")})
        return serializer.data


def serialize_cart(basket: Any, request) -> dict[str, Any]:
    basket_lines = list(basket.all_lines())
    serializer = CartSerializer(
        {
            "id": basket.id,
            "owner": basket.owner_id,
            "total_incl_tax": getattr(basket, "total_incl_tax", None),
            "total_excl_tax": getattr(basket, "total_excl_tax", None),
            "lines": basket_lines,
        },
        context={"request": request},
    )
    return serializer.data


def build_basket_hyperlink(request, basket_id: int) -> str:
    path = reverse("basket-detail", kwargs={"pk": basket_id})
    return request.build_absolute_uri(path)
