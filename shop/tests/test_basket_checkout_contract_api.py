import json

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from shop.tests.factories import ProductFactory


User = get_user_model()


class BasketCheckoutContractApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="contract-user",
            email="contract@example.com",
            password="Senha@123",
        )
        self.client.force_login(self.user)
        self.product = ProductFactory(product_class__requires_shipping=False)

    def _add_product(self, quantity: int = 1):
        response = self.client.post(
            "/api/basket/add-product/",
            data=json.dumps({"product_id": self.product.id, "quantity": quantity}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_get_basket_returns_contract_shape(self):
        self._add_product()

        response = self.client.get("/api/basket/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("id", payload)
        self.assertIn("owner", payload)
        self.assertIn("total_incl_tax", payload)
        self.assertIn("total_excl_tax", payload)
        self.assertIn("lines", payload)
        self.assertIsInstance(payload["lines"], list)

    def test_add_product_returns_embedded_lines(self):
        payload = self._add_product(quantity=2)

        self.assertIn("lines", payload)
        self.assertEqual(len(payload["lines"]), 1)
        self.assertEqual(payload["lines"][0]["quantity"], 2)
        self.assertIn("product", payload["lines"][0])

    def test_patch_basket_line_updates_and_zero_removes(self):
        payload = self._add_product(quantity=1)
        line_id = payload["lines"][0]["id"]

        update_response = self.client.patch(
            f"/api/basket/lines/{line_id}/",
            data=json.dumps({"quantity": 3}),
            content_type="application/json",
        )
        self.assertEqual(update_response.status_code, 200)
        updated_payload = update_response.json()
        self.assertEqual(updated_payload["lines"][0]["quantity"], 3)

        remove_response = self.client.patch(
            f"/api/basket/lines/{line_id}/",
            data=json.dumps({"quantity": 0}),
            content_type="application/json",
        )
        self.assertEqual(remove_response.status_code, 200)
        removed_payload = remove_response.json()
        self.assertEqual(removed_payload["lines"], [])

    def test_delete_basket_line_returns_200_success(self):
        payload = self._add_product(quantity=1)
        line_id = payload["lines"][0]["id"]

        response = self.client.delete(f"/api/basket/lines/{line_id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"success": True})

    def test_add_voucher_invalid_returns_400(self):
        self._add_product(quantity=1)

        response = self.client.post(
            "/api/basket/add-voucher/",
            data=json.dumps({"voucher": "INVALIDO"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    def test_shipping_methods_returns_array(self):
        self._add_product(quantity=1)

        response = self.client.get("/api/basket/shipping-methods/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsInstance(payload, list)
        if payload:
            self.assertIn("code", payload[0])
            self.assertIn("name", payload[0])
            self.assertIn("price_incl_tax", payload[0])

    def test_checkout_returns_201_and_order_shape(self):
        self._add_product(quantity=1)

        response = self.client.post(
            "/api/checkout/",
            data=json.dumps({"payment_method_code": "cash_on_delivery"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertIn("id", payload)
        self.assertIn("status", payload)
        self.assertEqual(payload["payment_status"], "pending")
        self.assertIn("lines", payload)

    def test_checkout_payment_methods_returns_enabled_methods(self):
        response = self.client.get("/api/checkout/payment-methods/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsInstance(payload, list)
        self.assertTrue(any(item["code"] == "pix" for item in payload))
        self.assertTrue(any(item["code"] == "cash_on_delivery" for item in payload))

    @override_settings(PIX_GATEWAY_BACKEND="api.checkout.gateway.AlwaysPaidPixGateway")
    def test_pix_checkout_returns_qr_and_status_endpoint_updates_payment(self):
        self._add_product(quantity=1)

        checkout_response = self.client.post(
            "/api/checkout/",
            data=json.dumps({"payment_method_code": "pix"}),
            content_type="application/json",
        )

        self.assertEqual(checkout_response.status_code, 201)
        checkout_payload = checkout_response.json()
        self.assertEqual(checkout_payload["payment_status"], "pending")
        self.assertIn("pix_qr_code", checkout_payload)
        self.assertTrue(checkout_payload["pix_qr_code"])

        status_response = self.client.get(f"/api/checkout/pix/status/{checkout_payload['id']}/")
        self.assertEqual(status_response.status_code, 200)
        status_payload = status_response.json()
        self.assertEqual(status_payload["payment_status"], "paid")
        self.assertEqual(status_payload["status"], "Authorized")

    def test_checkout_with_empty_basket_returns_400(self):
        response = self.client.post(
            "/api/checkout/",
            data=json.dumps({"payment_method_code": "pix"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    def test_checkout_accepts_brazil_address_contract_payload(self):
        self._add_product(quantity=1)

        response = self.client.post(
            "/api/checkout/",
            data=json.dumps(
                {
                    "payment_method_code": "cash_on_delivery",
                    "shipping_address": {
                        "cep": "77000-120",
                        "street": "Avenida JK",
                        "number": "123",
                        "complement": "Apto 10",
                        "bairro": "Centro",
                        "city": "Palmas",
                        "state": "TO",
                        "full_name": "Maria Silva",
                        "phone": "+55 63 99999-1234",
                    },
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertIn("id", payload)
        self.assertEqual(payload["payment_status"], "pending")

    def test_checkout_rejects_brazil_address_without_number(self):
        self._add_product(quantity=1)

        response = self.client.post(
            "/api/checkout/",
            data=json.dumps(
                {
                    "payment_method_code": "cash_on_delivery",
                    "shipping_address": {
                        "cep": "77000120",
                        "street": "Avenida JK",
                        "bairro": "Centro",
                        "city": "Palmas",
                        "state": "TO",
                        "full_name": "Maria Silva",
                    },
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("number", response.json().get("detail", ""))

    def test_checkout_rejects_invalid_brazil_cep_format(self):
        self._add_product(quantity=1)

        response = self.client.post(
            "/api/checkout/",
            data=json.dumps(
                {
                    "payment_method_code": "cash_on_delivery",
                    "shipping_address": {
                        "cep": "77-ABC",
                        "street": "Avenida JK",
                        "number": "123",
                        "bairro": "Centro",
                        "city": "Palmas",
                        "state": "TO",
                        "full_name": "Maria Silva",
                    },
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("CEP invalido", response.json().get("detail", ""))

    def test_checkout_rejects_unknown_address_fields(self):
        self._add_product(quantity=1)

        response = self.client.post(
            "/api/checkout/",
            data=json.dumps(
                {
                    "payment_method_code": "cash_on_delivery",
                    "shipping_address": {
                        "line1": "Rua das Flores, 120",
                        "foo": "bar",
                    },
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("nao suportados", response.json().get("detail", ""))
