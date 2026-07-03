from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.conf import settings
from django.utils import timezone

from api.checkout.models import PixTransaction


@dataclass
class PixChargeResult:
    reference: str
    status: str
    qr_code_payload: str
    copy_paste: str
    qr_code_image: str
    expires_at: object
    raw_response: dict


class BasePixGateway:
    def create_charge(self, *, amount: Decimal, order_number: str) -> PixChargeResult:
        raise NotImplementedError

    def get_status(self, transaction: PixTransaction) -> dict[str, object]:
        raise NotImplementedError


class MockPixGateway(BasePixGateway):
    def create_charge(self, *, amount: Decimal, order_number: str) -> PixChargeResult:
        reference = f"pix-{uuid4().hex[:20]}"
        expiration_minutes = max(int(getattr(settings, "PIX_EXPIRATION_MINUTES", 30)), 1)
        expires_at = timezone.now() + timedelta(minutes=expiration_minutes)

        payload = f"00020101021226860014br.gov.bcb.pix2564{reference}52040000530398654{amount:.2f}5802BR5913BURITI SHOP6009SAO PAULO62070503***6304ABCD"
        raw = {
            "provider": "mock",
            "reference": reference,
            "order_number": order_number,
            "amount": f"{amount:.2f}",
            "status": PixTransaction.STATUS_PENDING,
            "expires_at": expires_at.isoformat(),
        }
        return PixChargeResult(
            reference=reference,
            status=PixTransaction.STATUS_PENDING,
            qr_code_payload=payload,
            copy_paste=payload,
            qr_code_image=f"https://api.buritishopping.com.br/media/pix/qr/{reference}.png",
            expires_at=expires_at,
            raw_response=raw,
        )

    def get_status(self, transaction: PixTransaction) -> dict[str, object]:
        if transaction.status == PixTransaction.STATUS_PAID:
            return {"status": PixTransaction.STATUS_PAID, "raw_response": {"provider": "mock"}}

        if transaction.expires_at and timezone.now() >= transaction.expires_at:
            return {"status": PixTransaction.STATUS_EXPIRED, "raw_response": {"provider": "mock"}}

        return {"status": PixTransaction.STATUS_PENDING, "raw_response": {"provider": "mock"}}


class AlwaysPaidPixGateway(MockPixGateway):
    def get_status(self, transaction: PixTransaction) -> dict[str, object]:
        return {"status": PixTransaction.STATUS_PAID, "raw_response": {"provider": "mock", "paid": True}}
