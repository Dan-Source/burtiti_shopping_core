from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from django.conf import settings
from django.utils.module_loading import import_string
from oscar.core.loading import get_model

from api.checkout.gateway import BasePixGateway
from api.checkout.models import PixTransaction

Source = get_model("payment", "Source")
SourceType = get_model("payment", "SourceType")
PaymentEvent = get_model("order", "PaymentEvent")
PaymentEventType = get_model("order", "PaymentEventType")


@dataclass
class PaymentProcessingResult:
    payment_status: str
    pix_transaction: PixTransaction | None = None


def _create_source(order, source_type_name: str, amount: Decimal, reference: str = ""):
    source_type, _ = SourceType.objects.get_or_create(name=source_type_name)
    source_kwargs = {
        "source_type": source_type,
        "currency": order.currency,
        "amount_allocated": amount,
        "reference": reference,
    }
    source_field_names = {field.name for field in Source._meta.fields}
    if "order" in source_field_names:
        source_kwargs["order"] = order
    return Source.objects.create(**source_kwargs)


def _create_payment_event(order, event_name: str, amount: Decimal, reference: str = ""):
    event_type, _ = PaymentEventType.objects.get_or_create(name=event_name)
    return PaymentEvent.objects.create(
        order=order,
        event_type=event_type,
        amount=amount,
        reference=reference,
    )


class BasePaymentMethod:
    code = ""
    name = ""
    label = ""
    description = ""

    def process(self, *, request, basket, order) -> PaymentProcessingResult:
        raise NotImplementedError


class CashOnDeliveryPaymentMethod(BasePaymentMethod):
    code = "cash_on_delivery"
    name = "Pagamento na Entrega"
    label = "Pagar na entrega"
    description = "Pagamento realizado no ato da entrega"

    def process(self, *, request, basket, order) -> PaymentProcessingResult:
        total = order.total_incl_tax or Decimal("0.00")
        _create_source(order, source_type_name="Cash", amount=total)
        _create_payment_event(order, event_name="Cash-selected", amount=total)

        order.status = "Pending"
        order.save(update_fields=["status"])
        return PaymentProcessingResult(payment_status=PixTransaction.STATUS_PENDING)


class PixPaymentMethod(BasePaymentMethod):
    code = "pix"
    name = "PIX"
    label = "Pagar com PIX"
    description = "Pagamento instantaneo por QR Code"

    def _get_gateway(self) -> BasePixGateway:
        backend_path = getattr(settings, "PIX_GATEWAY_BACKEND", "api.checkout.gateway.MockPixGateway")
        backend_cls = import_string(backend_path)
        return backend_cls()

    def process(self, *, request, basket, order) -> PaymentProcessingResult:
        total = order.total_incl_tax or Decimal("0.00")
        gateway = self._get_gateway()
        charge = gateway.create_charge(amount=total, order_number=order.number)

        _create_source(order, source_type_name="PIX", amount=total, reference=charge.reference)
        _create_payment_event(order, event_name="PIX-generated", amount=total, reference=charge.reference)

        transaction = PixTransaction.objects.create(
            order=order,
            source_reference=charge.reference,
            qr_code_payload=charge.qr_code_payload,
            copy_paste=charge.copy_paste,
            qr_code_image=charge.qr_code_image,
            status=charge.status,
            expires_at=charge.expires_at,
            raw_response=charge.raw_response,
        )

        order.status = "Pending"
        order.save(update_fields=["status"])

        return PaymentProcessingResult(
            payment_status=charge.status,
            pix_transaction=transaction,
        )


def mark_pix_as_paid(order, transaction: PixTransaction):
    if transaction.status == PixTransaction.STATUS_PAID and order.status != "Authorized":
        order.status = "Authorized"
        order.save(update_fields=["status"])

        total = order.total_incl_tax or Decimal("0.00")
        _create_payment_event(order, event_name="PIX-paid", amount=total, reference=transaction.source_reference)

        source = Source.objects.filter(reference=transaction.source_reference).order_by("id").first()
        if source is not None:
            source.amount_debited = source.amount_allocated
            source.save(update_fields=["amount_debited"])
