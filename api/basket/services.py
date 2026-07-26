from __future__ import annotations

import re
from typing import Any

from oscar.core.loading import get_model

Country = get_model("address", "Country")

CEP_REGEX = re.compile(r"^\d{5}-?\d{3}$")

BR_ADDRESS_REQUIRED_FIELDS = {
    "cep",
    "street",
    "number",
    "bairro",
    "city",
    "state",
    "full_name",
}
BR_ADDRESS_OPTIONAL_FIELDS = {"complement", "phone", "country", "email"}


def split_full_name(full_name: str) -> tuple[str, str]:
    name = " ".join((full_name or "").split()).strip()
    if not name:
        raise ValueError("Nome completo e obrigatorio.")
    parts = name.split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else "-"
    return first_name, last_name


def normalize_cep(cep: str) -> str:
    normalized = (cep or "").strip()
    if not CEP_REGEX.match(normalized):
        raise ValueError("CEP invalido. Use o formato 00000-000.")
    digits = normalized.replace("-", "")
    return f"{digits[:5]}-{digits[5:]}"
def normalize_phone_number(phone: str) -> str:
    normalized = (phone or "").strip()
    if not normalized:
        return ""

    digits = re.sub(r"\D", "", normalized)

    if digits.startswith("55"):
        digits = digits[2:]

    if len(digits) < 10 or len(digits) > 11:
        raise ValueError("Numero de telefone invalido. Use o formato (00) 00000-0000.")

    return f"+55{digits}"

def is_brazil_contract_payload(raw_address: dict[str, Any]) -> bool:
    known_br_fields = BR_ADDRESS_REQUIRED_FIELDS | BR_ADDRESS_OPTIONAL_FIELDS
    return any(field in raw_address for field in known_br_fields)


def validate_unknown_fields(raw_address: dict[str, Any], allowed_fields: set[str]):
    unknown_fields = sorted(set(raw_address.keys()) - allowed_fields)
    if unknown_fields:
        raise ValueError(f"Campos de endereco nao suportados: {', '.join(unknown_fields)}.")


def validate_brazil_address_required_fields(raw_address: dict[str, Any]):
    missing_fields = [
        field
        for field in BR_ADDRESS_REQUIRED_FIELDS
        if not str(raw_address.get(field, "")).strip()
    ]
    if missing_fields:
        raise ValueError(
            f"Campos obrigatorios do endereco ausentes: {', '.join(sorted(missing_fields))}."
        )


def map_brazil_address_to_oscar(raw_address: dict[str, Any]) -> dict[str, Any]:
    validate_brazil_address_required_fields(raw_address)
    allowed_input_fields = BR_ADDRESS_REQUIRED_FIELDS | BR_ADDRESS_OPTIONAL_FIELDS
    validate_unknown_fields(raw_address, allowed_input_fields)

    first_name, last_name = split_full_name(str(raw_address.get("full_name", "")))
    street = str(raw_address.get("street", "")).strip()
    number = str(raw_address.get("number", "")).strip()
    complement = str(raw_address.get("complement", "")).strip()
    bairro = str(raw_address.get("bairro", "")).strip()
    city = str(raw_address.get("city", "")).strip()
    state = str(raw_address.get("state", "")).strip()
    phone = normalize_phone_number(str(raw_address.get("phone", "")).strip())
    postcode = normalize_cep(str(raw_address.get("cep", "")))

    return {
        "first_name": first_name,
        "last_name": last_name,
        "line1": street,
        "line2": number,
        "line3": bairro,
        "line4": city,
        "state": state,
        "postcode": postcode,
        "phone_number": phone,
        "notes": complement,
    }


def serialize_oscar_address_to_brazil(user_address: Any) -> dict[str, Any]:
    full_name_parts = []
    if user_address.first_name:
        full_name_parts.append(user_address.first_name)
    if user_address.last_name and user_address.last_name != "-":
        full_name_parts.append(user_address.last_name)
    full_name = " ".join(full_name_parts) if full_name_parts else ""

    phone_raw = user_address.phone_number
    phone_str = str(phone_raw) if phone_raw else ""

    return {
        "id": user_address.id,
        "full_name": full_name,
        "street": user_address.line1 or "",
        "number": user_address.line2 or "",
        "bairro": user_address.line3 or "",
        "city": user_address.line4 or "",
        "state": user_address.state or "",
        "cep": user_address.postcode or "",
        "complement": user_address.notes or "",
        "phone": phone_str,
        "is_default_for_shipping": user_address.is_default_for_shipping,
        "is_default_for_billing": user_address.is_default_for_billing,
    }


def resolve_country_url(request, raw_address: dict[str, Any]) -> str | None:
    country_value = raw_address.get("country")
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
    if country is None:
        return None

    return request.build_absolute_uri(f"/api/countries/{country.iso_3166_1_a2}/")


def extract_email_from_address_payload(raw_address: Any) -> str | None:
    if isinstance(raw_address, dict):
        email = raw_address.get("email")
        if isinstance(email, str) and email.strip():
            return email.strip()
    return None
