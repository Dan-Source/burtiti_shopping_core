from decimal import Decimal
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from oscar.core.loading import get_model

from shop.tests.factories import ProductFactory


class CatalogApiTests(TestCase):
    def setUp(self):
        self.Category = get_model("catalogue", "Category")
        self.ProductAttribute = get_model("catalogue", "ProductAttribute")
        self.ProductAttributeValue = get_model("catalogue", "ProductAttributeValue")
        self.ProductImage = get_model("catalogue", "ProductImage")
        self.ProductReview = get_model("reviews", "ProductReview")
        self.Range = get_model("offer", "Range")
        self.Condition = get_model("offer", "Condition")
        self.Benefit = get_model("offer", "Benefit")
        self.ConditionalOffer = get_model("offer", "ConditionalOffer")

        self.root_category = self.Category.add_root(
            name="Eletronicos",
            slug="eletronicos",
            code="eletronicos",
            is_public=True,
        )
        self.phone_category = self.root_category.add_child(
            name="Smartphones",
            slug="smartphones",
            code="eletronicos-smartphones",
            is_public=True,
        )

        self.product_a = ProductFactory(title="Galaxy S", slug="galaxy-s")
        self.product_b = ProductFactory(title="Notebook X", slug="notebook-x")
        self.product_a.categories.set([self.phone_category])
        self.product_b.categories.set([self.root_category])

        stock_a = self.product_a.stockrecords.first()
        stock_b = self.product_b.stockrecords.first()
        stock_a.price = Decimal("1190.00")
        stock_a.num_in_stock = 8
        stock_a.save(update_fields=["price", "num_in_stock"])
        stock_b.price = Decimal("900.00")
        stock_b.num_in_stock = 0
        stock_b.save(update_fields=["price", "num_in_stock"])

        brand_attribute = self.ProductAttribute.objects.create(
            product_class=self.product_a.product_class,
            name="Marca",
            code="brand",
            type=self.ProductAttribute.TEXT,
            required=False,
        )
        self.ProductAttributeValue.objects.create(
            product=self.product_a,
            attribute=brand_attribute,
            value_text="Samsung",
        )

        self.ProductReview.objects.create(
            product=self.product_a,
            score=5,
            title="Excelente",
            body="Muito bom",
            status=self.ProductReview.APPROVED,
        )

        offer_range = self.Range.objects.create(
            name="Promo Galaxy",
            slug="promo-galaxy",
            includes_all_products=False,
        )
        offer_range.included_products.add(self.product_a)
        condition = self.Condition.objects.create(
            range=offer_range,
            type=self.Condition.COUNT,
            value=1,
        )
        benefit = self.Benefit.objects.create(
            range=offer_range,
            type=self.Benefit.PERCENTAGE,
            value=Decimal("10.0"),
        )
        self.ConditionalOffer.objects.create(
            name="Oferta Galaxy",
            slug="oferta-galaxy",
            offer_type=self.ConditionalOffer.SITE,
            status=self.ConditionalOffer.OPEN,
            condition=condition,
            benefit=benefit,
            start_datetime=timezone.now() - timedelta(days=1),
        )

    def test_products_list_returns_paginated_contract(self):
        response = self.client.get("/api/products/?page=1&page_size=1&ordering=-created_at")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("count", payload)
        self.assertIn("next", payload)
        self.assertIn("previous", payload)
        self.assertIn("results", payload)
        self.assertEqual(len(payload["results"]), 1)

        product_item = payload["results"][0]
        self.assertIn("price", product_item)
        self.assertIn("category", product_item)
        self.assertIn("is_on_sale", product_item)

    def test_products_filters_brand_stock_and_on_sale(self):
        response = self.client.get("/api/products/?brands=samsung&in_stock=true&on_sale=true")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["id"], self.product_a.id)
        self.assertEqual(payload["results"][0]["brand"], "Samsung")

    def test_product_detail_returns_extended_fields(self):
        response = self.client.get(f"/api/products/{self.product_a.id}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("images", payload)
        self.assertIn("attributes", payload)
        self.assertIn("discounted_price", payload)
        self.assertEqual(payload["id"], self.product_a.id)

    def test_categories_returns_tree_with_page_size_limiting_roots(self):
        self.Category.add_root(
            name="Moda",
            slug="moda",
            code="moda",
            is_public=True,
        )

        response = self.client.get("/api/categories/?page_size=1")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertIn("children", payload[0])

    def test_non_catalog_oscar_api_routes_are_not_exposed(self):
        response = self.client.get("/api/basket/")

        self.assertEqual(response.status_code, 404)

    def test_schema_only_contains_catalog_routes(self):
        response = self.client.get("/api/schema/")

        self.assertEqual(response.status_code, 200)
        body = response.content.decode("utf-8")
        self.assertIn("/api/products/", body)
        self.assertIn("/api/categories/", body)
        self.assertNotIn("/api/basket/", body)
