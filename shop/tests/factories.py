from decimal import Decimal
from uuid import uuid4

import factory
from factory.django import DjangoModelFactory
from oscar.core.loading import get_model

Product = get_model("catalogue", "Product")
ProductClass = get_model("catalogue", "ProductClass")
Partner = get_model("partner", "Partner")
StockRecord = get_model("partner", "StockRecord")


class ProductClassFactory(DjangoModelFactory):
    class Meta:
        model = ProductClass

    name = factory.Sequence(lambda n: f"Classe {n}")
    slug = factory.LazyFunction(lambda: f"classe-{uuid4().hex[:12]}")
    requires_shipping = True
    track_stock = True


class PartnerFactory(DjangoModelFactory):
    class Meta:
        model = Partner

    name = factory.Sequence(lambda n: f"Parceiro {n}")
    code = factory.LazyFunction(lambda: f"P-{uuid4().hex[:10]}")


class ProductFactory(DjangoModelFactory):
    class Meta:
        model = Product

    structure = Product.STANDALONE
    upc = factory.LazyFunction(lambda: f"UPC-{uuid4().hex[:12]}")
    title = factory.Sequence(lambda n: f"Produto {n}")
    slug = factory.LazyFunction(lambda: f"produto-{uuid4().hex[:12]}")
    is_public = True
    product_class = factory.SubFactory(ProductClassFactory)

    @factory.post_generation
    def with_stock(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted is False:
            return

        StockRecordFactory(product=self)


class StockRecordFactory(DjangoModelFactory):
    class Meta:
        model = StockRecord

    product = factory.SubFactory(ProductFactory, with_stock=False)
    partner = factory.SubFactory(PartnerFactory)
    partner_sku = factory.Sequence(lambda n: f"SKU-{n:06d}")
    price_currency = "BRL"
    price = Decimal("100.00")
    num_in_stock = 10
