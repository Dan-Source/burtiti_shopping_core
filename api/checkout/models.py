from django.db import models


class PixTransaction(models.Model):
    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_EXPIRED = "expired"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
        (STATUS_EXPIRED, "Expired"),
    ]

    order = models.OneToOneField(
        "order.Order",
        on_delete=models.CASCADE,
        related_name="pix_transaction",
    )
    source_reference = models.CharField(max_length=128, db_index=True)
    qr_code_payload = models.TextField(blank=True)
    copy_paste = models.TextField(blank=True)
    qr_code_image = models.URLField(blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    expires_at = models.DateTimeField(null=True, blank=True)
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"PIX transaction order={self.order_id} status={self.status}"
