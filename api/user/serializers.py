from __future__ import annotations

from typing import Any

from oscar.core.loading import get_model
from rest_framework import serializers

from api.basket.services import (
    map_brazil_address_to_oscar,
    normalize_cep,
    normalize_phone_number,
    serialize_oscar_address_to_brazil,
    split_full_name,
)

UserAddress = get_model("address", "UserAddress")


class BrazilianAddressInputSerializer(serializers.Serializer):
    full_name = serializers.CharField()
    cep = serializers.CharField()
    street = serializers.CharField()
    number = serializers.CharField()
    bairro = serializers.CharField()
    city = serializers.CharField()
    state = serializers.CharField()
    complement = serializers.CharField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(required=False, allow_blank=True, default="")
    country = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_cep(self, value):
        return normalize_cep(value)

    def validate_phone(self, value):
        return normalize_phone_number(value)

    def validate_full_name(self, value):
        split_full_name(value)
        return value

    def validate(self, data):
        known_fields = {
            "full_name", "cep", "street", "number", "bairro",
            "city", "state", "complement", "phone", "country",
        }
        unknown = set(self.initial_data.keys()) - known_fields
        if unknown:
            raise serializers.ValidationError(
                f"Campos de endereco nao suportados: {', '.join(sorted(unknown))}."
            )
        return data

    def to_oscar_data(self) -> dict[str, Any]:
        validated = self.validated_data
        payload = {
            "full_name": validated["full_name"],
            "cep": validated["cep"],
            "street": validated["street"],
            "number": validated["number"],
            "bairro": validated["bairro"],
            "city": validated["city"],
            "state": validated["state"],
            "complement": validated.get("complement", ""),
            "phone": validated.get("phone", ""),
        }
        if validated.get("country"):
            payload["country"] = validated["country"]
        return map_brazil_address_to_oscar(payload)


class BrazilianAddressOutputSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField()
    cep = serializers.CharField(source="postcode")
    street = serializers.CharField(source="line1")
    number = serializers.CharField(source="line2")
    bairro = serializers.CharField(source="line3")
    city = serializers.CharField(source="line4")
    state = serializers.CharField()
    complement = serializers.CharField(source="notes", allow_blank=True)
    phone = serializers.CharField(source="phone_number", allow_blank=True)
    is_default_for_shipping = serializers.BooleanField(read_only=True)
    is_default_for_billing = serializers.BooleanField(read_only=True)

    def to_representation(self, instance):
        return serialize_oscar_address_to_brazil(instance)
