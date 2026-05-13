from django.test import TestCase
from django.urls import reverse

from shop.tests.factories import ProductFactory


class CartFlowTests(TestCase):
    def setUp(self):
        self.product = ProductFactory()
        self.add_url = reverse("cart-add", kwargs={"slug": self.product.slug})
        self.cart_url = reverse("cart-detail")
        self.update_url = reverse("cart-update", kwargs={"slug": self.product.slug})

    def _cart_session(self):
        return self.client.session.get("cart", {})

    def test_add_to_cart_adds_one_unit(self):
        response = self.client.post(self.add_url, follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._cart_session()[str(self.product.id)]["quantity"], 1)
        self.assertContains(response, "foi adicionado ao carrinho")

    def test_add_same_product_increments_quantity(self):
        self.client.post(self.add_url)
        self.client.post(self.add_url)

        self.assertEqual(self._cart_session()[str(self.product.id)]["quantity"], 2)

    def test_add_to_cart_rejects_out_of_stock_product(self):
        stockrecord = self.product.stockrecords.first()
        stockrecord.num_in_stock = 0
        stockrecord.save(update_fields=["num_in_stock"])

        response = self.client.post(self.add_url, follow=True)

        self.assertEqual(self._cart_session(), {})
        self.assertContains(response, "sem estoque")

    def test_cart_update_changes_quantity(self):
        self.client.post(self.add_url)

        response = self.client.post(self.update_url, {"quantity": 4}, follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._cart_session()[str(self.product.id)]["quantity"], 4)
        self.assertContains(response, "atualizada para 4")

    def test_cart_update_with_zero_removes_item(self):
        self.client.post(self.add_url)

        response = self.client.post(self.update_url, {"quantity": 0}, follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._cart_session(), {})
        self.assertContains(response, "foi removido do carrinho")

    def test_cart_page_renders_current_quantity(self):
        self.client.post(self.add_url)
        self.client.post(self.update_url, {"quantity": 3})

        response = self.client.get(self.cart_url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.product.get_title())
        self.assertContains(response, 'value="3"', html=False)
