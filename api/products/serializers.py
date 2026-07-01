from __future__ import annotations

from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db.models import Avg, Sum
from django.urls import reverse
from django.utils import timezone
from oscar.core.loading import get_model
from rest_framework import serializers

Product = get_model("catalogue", "Product")
ProductReview = get_model("reviews", "ProductReview")

DISCOUNT_PERCENTAGE = "Percentage"
DISCOUNT_FIXED = "Fixed"
DISCOUNT_FIXED_PRICE = "Fixed price"
DISCOUNT_ABSOLUTE = "Absolute"
DEFAULT_TAX_RATE = Decimal("0.19")
BRAND_ATTRIBUTE_CODES = {"brand", "marca", "fabricante"}


class ErrorSerializer(serializers.Serializer):
    detail = serializers.CharField()
    code = serializers.CharField(required=False, allow_null=True)


class PriceSerializer(serializers.Serializer):
    currency = serializers.CharField(min_length=3, max_length=3)
    excl_tax = serializers.CharField()
    incl_tax = serializers.CharField()


class CategorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    parent_id = serializers.IntegerField(allow_null=True)


class ProductListQueryParamsSerializer(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1, required=False)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=20, required=False)
    search = serializers.CharField(max_length=200, required=False, allow_blank=False)
    category = serializers.CharField(required=False)
    categories = serializers.CharField(required=False)
    min_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)
    max_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)
    rating = serializers.DecimalField(max_digits=2, decimal_places=1, min_value=1, max_value=5, required=False)
    brands = serializers.CharField(required=False)
    in_stock = serializers.BooleanField(required=False, default=False)
    on_sale = serializers.BooleanField(required=False, default=False)
    ordering = serializers.ChoiceField(
        required=False,
        default="-created_at",
        choices=[
            "price",
            "-price",
            "created_at",
            "-created_at",
            "rating",
            "-rating",
            "title",
            "-title",
            "views",
            "-views",
        ],
    )

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        min_price = attrs.get("min_price")
        max_price = attrs.get("max_price")
        if min_price is not None and max_price is not None and min_price > max_price:
            raise serializers.ValidationError({"detail": "min_price nao pode ser maior que max_price."})
        return attrs


class CategoryQueryParamsSerializer(serializers.Serializer):
    page_size = serializers.IntegerField(min_value=1, max_value=500, default=100, required=False)


def decimal_to_string(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return f"{value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}"


def split_csv(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    return [value.strip() for value in raw_value.split(",") if value.strip()]


class CategoryTreeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    image = serializers.SerializerMethodField()
    count = serializers.IntegerField()
    children = serializers.SerializerMethodField()

    def get_image(self, obj: dict[str, Any]) -> str | None:
        return obj.get("image")

    def get_children(self, obj: dict[str, Any]) -> list[dict[str, Any]]:
        children = obj.get("children", [])
        serializer = CategoryTreeSerializer(children, many=True, context=self.context)
        return serializer.data


class ProductListItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField(allow_null=True)
    name = serializers.SerializerMethodField()
    slug = serializers.CharField()
    description = serializers.CharField(allow_null=True)
    upc = serializers.CharField(allow_null=True)
    url = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    discounted_price = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    is_new = serializers.SerializerMethodField()
    is_on_sale = serializers.SerializerMethodField()
    installments = serializers.SerializerMethodField()
    brand = serializers.SerializerMethodField()

    def get_name(self, obj: Any) -> str:
        return obj.title

    def get_url(self, obj: Any) -> str | None:
        request = self.context.get("request")
        path = reverse("api-product-detail", kwargs={"id": obj.id})
        if request:
            return request.build_absolute_uri(path)
        return path

    def get_price(self, obj: Any) -> dict[str, Any] | None:
        stockrecord = obj.stockrecords.order_by("price").first()
        if not stockrecord or stockrecord.price is None:
            return None
        excl_tax = stockrecord.price
        incl_tax = (stockrecord.price * (Decimal("1.00") + DEFAULT_TAX_RATE)).quantize(Decimal("0.01"))
        return {
            "currency": stockrecord.price_currency,
            "excl_tax": decimal_to_string(excl_tax),
            "incl_tax": decimal_to_string(incl_tax),
        }

    def get_image(self, obj: Any) -> str | None:
        request = self.context.get("request")
        image = obj.images.order_by("display_order").first()
        if not image or not image.original:
            return None
        if request:
            return request.build_absolute_uri(image.original.url)
        return image.original.url

    def _active_offers_for_product(self, obj: Any) -> list[Any]:
        offer_map = self.context.get("active_offers_map") or {}
        return offer_map.get(obj.id, [])

    def _best_discounted_price(self, obj: Any) -> Decimal | None:
        stockrecord = obj.stockrecords.order_by("price").first()
        if not stockrecord or stockrecord.price is None:
            return None

        base_price = stockrecord.price
        discounted_candidates: list[Decimal] = []
        for offer in self._active_offers_for_product(obj):
            benefit = getattr(offer, "benefit", None)
            if not benefit:
                continue

            if benefit.type == DISCOUNT_PERCENTAGE:
                discounted_candidates.append(base_price * (Decimal("1.00") - (benefit.value / Decimal("100"))))
            elif benefit.type in {DISCOUNT_FIXED, DISCOUNT_ABSOLUTE}:
                discounted_candidates.append(base_price - benefit.value)
            elif benefit.type == DISCOUNT_FIXED_PRICE:
                discounted_candidates.append(benefit.value)

        if not discounted_candidates:
            return None

        best_price = min(discounted_candidates)
        if best_price >= base_price:
            return None

        return max(best_price, Decimal("0.00")).quantize(Decimal("0.01"))

    def get_discounted_price(self, obj: Any) -> str | None:
        value = self._best_discounted_price(obj)
        return decimal_to_string(value)

    def get_discount_percentage(self, obj: Any) -> int | None:
        discounted_value = self._best_discounted_price(obj)
        stockrecord = obj.stockrecords.order_by("price").first()
        if discounted_value is None or not stockrecord or not stockrecord.price:
            return None

        if stockrecord.price <= 0:
            return None

        discount_ratio = (stockrecord.price - discounted_value) / stockrecord.price
        return int((discount_ratio * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

    def get_stock(self, obj: Any) -> int:
        total_stock = obj.stockrecords.aggregate(total=Sum("num_in_stock")).get("total")
        return max(int(total_stock or 0), 0)

    def get_rating(self, obj: Any) -> float | None:
        avg_score = ProductReview.objects.filter(product=obj, status=ProductReview.APPROVED).aggregate(
            avg=Avg("score")
        )["avg"]
        if avg_score is None:
            return None
        return float(round(avg_score, 1))

    def get_reviews_count(self, obj: Any) -> int | None:
        return ProductReview.objects.filter(product=obj, status=ProductReview.APPROVED).count()

    def get_category(self, obj: Any) -> dict[str, Any] | None:
        category = obj.categories.order_by("depth", "path").first()
        if not category:
            return None
        parent = category.get_parent()
        return {
            "id": category.id,
            "name": category.name,
            "parent_id": parent.id if parent else None,
        }

    def get_is_new(self, obj: Any) -> bool:
        created_limit = timezone.now() - timedelta(days=30)
        if obj.date_created is None:
            return False
        return obj.date_created >= created_limit

    def get_is_on_sale(self, obj: Any) -> bool:
        return bool(self._active_offers_for_product(obj))

    def get_installments(self, obj: Any) -> int | None:
        stockrecord = obj.stockrecords.order_by("price").first()
        if not stockrecord or stockrecord.price is None:
            return None

        if stockrecord.price >= Decimal("1000"):
            return 12
        if stockrecord.price >= Decimal("700"):
            return 10
        if stockrecord.price >= Decimal("400"):
            return 8
        if stockrecord.price >= Decimal("200"):
            return 6
        return 3

    def get_brand(self, obj: Any) -> str | None:
        for attribute_value in obj.attribute_values.select_related("attribute").all():
            code = (attribute_value.attribute.code or "").strip().lower()
            name = (attribute_value.attribute.name or "").strip().lower()
            if code in BRAND_ATTRIBUTE_CODES or name in BRAND_ATTRIBUTE_CODES:
                value = attribute_value.value_as_text
                if value:
                    return value
        return None


class ProductDetailSerializer(ProductListItemSerializer):
    images = serializers.SerializerMethodField()
    attributes = serializers.SerializerMethodField(allow_null=True)

    def get_images(self, obj: Any) -> list[str]:
        request = self.context.get("request")
        image_urls: list[str] = []
        for image in obj.images.order_by("display_order"):
            if not image.original:
                continue
            if request:
                image_urls.append(request.build_absolute_uri(image.original.url))
            else:
                image_urls.append(image.original.url)
        return image_urls

    def get_attributes(self, obj: Any) -> dict[str, Any] | None:
        attrs: dict[str, Any] = {}
        for value in obj.attribute_values.select_related("attribute").all():
            key = (value.attribute.code or value.attribute.name or "").strip()
            if not key:
                continue
            attrs[key] = value.value_as_text
        return attrs or None


class PaginatedProductsSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = ProductListItemSerializer(many=True)
