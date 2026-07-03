from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("order", "0020_alter_order_analytics_tracked"),
    ]

    operations = [
        migrations.CreateModel(
            name="PixTransaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("source_reference", models.CharField(db_index=True, max_length=128)),
                ("qr_code_payload", models.TextField(blank=True)),
                ("copy_paste", models.TextField(blank=True)),
                ("qr_code_image", models.URLField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pending"), ("paid", "Paid"), ("expired", "Expired")],
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("raw_response", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "order",
                    models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="pix_transaction", to="order.order"),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
