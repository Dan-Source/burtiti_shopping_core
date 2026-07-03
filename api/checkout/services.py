from __future__ import annotations

from django.conf import settings
from django.utils.module_loading import import_string


def get_enabled_payment_methods() -> list[dict[str, str]]:
    methods = getattr(settings, "API_ENABLED_PAYMENT_METHODS", [])
    normalized: list[dict[str, str]] = []

    for method in methods:
        if isinstance(method, str):
            handler_cls = import_string(method)
            normalized.append(
                {
                    "code": getattr(handler_cls, "code", ""),
                    "name": getattr(handler_cls, "name", ""),
                    "label": getattr(handler_cls, "label", ""),
                    "description": getattr(handler_cls, "description", ""),
                    "handler": method,
                }
            )
            continue

        if isinstance(method, dict):
            normalized.append(
                {
                    "code": method.get("code", ""),
                    "name": method.get("name", ""),
                    "label": method.get("label", ""),
                    "description": method.get("description", ""),
                    "handler": method.get("handler", ""),
                }
            )

    return [item for item in normalized if item.get("code") and item.get("handler")]


def get_payment_method_by_code(code: str):
    for method in get_enabled_payment_methods():
        if method["code"] == code:
            return method
    return None
