from django.shortcuts import render
from oscar.apps.catalogue.models import Product
from oscar.apps.partner.strategy import Selector


def index(request):
    strategy = Selector().strategy(request)
    products = (
        Product.objects.filter(parent__isnull=True, is_public=True)
        .prefetch_related("stockrecords", "images")
        .order_by("-date_created")[:12]
    )

    product_cards = []
    for product in products:
        purchase_info = strategy.fetch_for_product(product)
        price = purchase_info.price

        price_text = "Sem preco"
        if price and price.exists and price.incl_tax is not None:
            price_text = f"R$ {price.incl_tax:.2f}"

        image = product.primary_image()
        image_url = (
            getattr(getattr(image, "original", None), "url", "") if image else ""
        )

        product_cards.append(
            {
                "title": product.get_title(),
                "url": product.get_absolute_url(),
                "price": price_text,
                "image_url": image_url,
            }
        )

    return render(request, "index.html", {"products": product_cards})
