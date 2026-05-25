from django.contrib.auth import get_user_model
from django.test import TestCase
from oscar.core.loading import get_model

from core.seed_checkout_data import DEFAULT_PRODUCT_SEEDS, USER_ADDRESS_TITLE, seed_checkout_data


class SeedCheckoutDataTests(TestCase):
    def setUp(self):
        self.Country = get_model("address", "Country")
        self.Partner = get_model("partner", "Partner")
        self.Product = get_model("catalogue", "Product")
        self.ProductClass = get_model("catalogue", "ProductClass")
        self.StockRecord = get_model("partner", "StockRecord")
        self.UserAddress = get_model("address", "UserAddress")
        self.User = get_user_model()

    def test_seed_creates_catalog_and_checkout_users(self):
        result = seed_checkout_data(user_count=2, password="Senha@123")

        self.assertTrue(
            self.Country.objects.filter(
                iso_3166_1_a2="BR",
                is_shipping_country=True,
            ).exists()
        )
        self.assertEqual(self.Partner.objects.filter(code="BURITI-DEMO").count(), 1)
        self.assertEqual(self.Product.objects.count(), len(DEFAULT_PRODUCT_SEEDS))
        self.assertEqual(self.StockRecord.objects.count(), len(DEFAULT_PRODUCT_SEEDS))
        self.assertEqual(
            self.ProductClass.objects.count(),
            len({seed.product_type for seed in DEFAULT_PRODUCT_SEEDS}),
        )

        first_product = self.Product.objects.get(upc=DEFAULT_PRODUCT_SEEDS[0].upc)
        self.assertTrue(first_product.categories.exists())
        self.assertEqual(first_product.stockrecords.get().price_currency, "BRL")

        first_user = self.User.objects.get(username="cliente_teste_1")
        self.assertTrue(first_user.check_password("Senha@123"))
        self.assertEqual(first_user.email, "cliente.teste1@buriti.local")

        address = self.UserAddress.objects.get(
            user=first_user,
            title=USER_ADDRESS_TITLE,
        )
        self.assertTrue(address.is_default_for_shipping)
        self.assertTrue(address.is_default_for_billing)
        self.assertEqual(address.country.iso_3166_1_a2, "BR")

        self.assertEqual(len(result["users"]), 2)
        self.assertEqual(len(result["products"]), len(DEFAULT_PRODUCT_SEEDS))

    def test_seed_is_idempotent_for_products_and_users(self):
        seed_checkout_data(user_count=2, password="Senha@123")
        seed_checkout_data(user_count=2, password="NovaSenha@123")

        self.assertEqual(self.Product.objects.count(), len(DEFAULT_PRODUCT_SEEDS))
        self.assertEqual(self.StockRecord.objects.count(), len(DEFAULT_PRODUCT_SEEDS))
        self.assertEqual(self.User.objects.filter(username__startswith="cliente_teste_").count(), 2)
        self.assertEqual(self.UserAddress.objects.filter(title=USER_ADDRESS_TITLE).count(), 2)

        first_user = self.User.objects.get(username="cliente_teste_1")
        self.assertTrue(first_user.check_password("NovaSenha@123"))
