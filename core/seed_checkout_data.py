from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify
from oscar.core.loading import get_model


@dataclass(frozen=True)
class ProductSeed:
    upc: str
    title: str
    description: str
    product_type: str
    category_path: tuple[str, ...]
    price: Decimal
    stock: int


DEFAULT_PRODUCT_SEEDS: tuple[ProductSeed, ...] = (
    ProductSeed(
        upc="BURITI-CAFE-250",
        title="Cafe Buriti 250g",
        description="Cafe torrado e moido para testes de vitrine e checkout.",
        product_type="Bebida",
        category_path=("Mercearia", "Bebidas", "Cafe"),
        price=Decimal("18.90"),
        stock=25,
    ),
    ProductSeed(
        upc="BURITI-SUCO-UVA",
        title="Suco Integral de Uva 1L",
        description="Produto de teste para catalogo com entrega residencial.",
        product_type="Bebida",
        category_path=("Mercearia", "Bebidas", "Sucos"),
        price=Decimal("14.50"),
        stock=18,
    ),
    ProductSeed(
        upc="BURITI-ARROZ-5KG",
        title="Arroz Branco Tipo 1 5kg",
        description="Item basico para validar estoque, carrinho e frete.",
        product_type="Alimento",
        category_path=("Mercearia", "Basicos", "Graos"),
        price=Decimal("29.90"),
        stock=32,
    ),
    ProductSeed(
        upc="BURITI-CASTANHA-200",
        title="Castanha do Para 200g",
        description="Produto premium para testar precificacao em BRL.",
        product_type="Alimento",
        category_path=("Mercearia", "Snacks", "Oleaginosas"),
        price=Decimal("22.40"),
        stock=14,
    ),
    ProductSeed(
        upc="BURITI-CANECA-360",
        title="Caneca Ceramica 360ml",
        description="Item para testar produtos de casa e cozinha.",
        product_type="Utilidade domestica",
        category_path=("Casa e Cozinha", "Utensilios", "Canecas"),
        price=Decimal("27.00"),
        stock=20,
    ),
    ProductSeed(
        upc="BURITI-FRIGIDEIRA-24",
        title="Frigideira Antiaderente 24cm",
        description="Produto com estoque para testar fluxo completo de compra.",
        product_type="Utilidade domestica",
        category_path=("Casa e Cozinha", "Panelas", "Frigideiras"),
        price=Decimal("89.90"),
        stock=11,
    ),
)


USER_ADDRESS_TITLE = "Endereco de teste"
BRAZIL_DATA = {
    "iso_3166_1_a2": "BR",
    "iso_3166_1_a3": "BRA",
    "iso_3166_1_numeric": "076",
    "printable_name": "Brasil",
    "name": "Brazil",
    "display_order": 1,
    "is_shipping_country": True,
}


def build_user_seed(index: int) -> dict[str, str]:
    return {
        "username": f"cliente_teste_{index}",
        "email": f"cliente.teste{index}@buriti.local",
        "first_name": f"Cliente {index}",
        "last_name": "Teste",
        "line1": f"Rua das Compras, {100 + index}",
        "line2": f"Apto {index}",
        "line4": "Palmas",
        "state": "TO",
        "postcode": f"7700{index:02d}",
        "phone_number": f"+55 63 99999-00{index:02d}",
    }


def get_seed_models() -> dict[str, Any]:
    return {
        "Category": get_model("catalogue", "Category"),
        "Country": get_model("address", "Country"),
        "Partner": get_model("partner", "Partner"),
        "Product": get_model("catalogue", "Product"),
        "ProductClass": get_model("catalogue", "ProductClass"),
        "StockRecord": get_model("partner", "StockRecord"),
        "UserAddress": get_model("address", "UserAddress"),
    }


def sync_instance(instance: Any, defaults: dict[str, Any]) -> bool:
    updated_fields: list[str] = []
    for field_name, value in defaults.items():
        if getattr(instance, field_name) != value:
            setattr(instance, field_name, value)
            updated_fields.append(field_name)

    if updated_fields:
        instance.save(update_fields=updated_fields)

    return bool(updated_fields)


def ensure_country(models: dict[str, Any]) -> tuple[Any, bool]:
    country, created = models["Country"].objects.update_or_create(
        iso_3166_1_a2=BRAZIL_DATA["iso_3166_1_a2"],
        defaults={key: value for key, value in BRAZIL_DATA.items() if key != "iso_3166_1_a2"},
    )
    return country, created


def ensure_partner(models: dict[str, Any]) -> tuple[Any, bool]:
    partner, created = models["Partner"].objects.update_or_create(
        code="BURITI-DEMO",
        defaults={"name": "Parceiro Demo Buriti"},
    )
    return partner, created


def ensure_product_class(models: dict[str, Any], name: str) -> tuple[Any, bool]:
    product_class, created = models["ProductClass"].objects.update_or_create(
        slug=slugify(name),
        defaults={
            "name": name,
            "requires_shipping": True,
            "track_stock": True,
        },
    )
    return product_class, created


def ensure_category_path(models: dict[str, Any], path_parts: tuple[str, ...]) -> tuple[Any, bool]:
    category_model = models["Category"]
    category = None
    created_any = False
    slug_parts: list[str] = []

    for part in path_parts:
        slug = slugify(part)
        slug_parts.append(slug)
        defaults = {
            "name": part,
            "slug": slug,
            "code": "-".join(slug_parts),
            "description": f"Categoria de teste: {' > '.join(path_parts)}",
            "is_public": True,
        }

        if category is None:
            existing = category_model.get_root_nodes().filter(slug=slug).first()
            if existing is None:
                category = category_model.add_root(**defaults)
                created_any = True
            else:
                sync_instance(existing, defaults)
                category = existing
            continue

        existing = category.get_children().filter(slug=slug).first()
        if existing is None:
            category = category.add_child(**defaults)
            created_any = True
        else:
            sync_instance(existing, defaults)
            category = existing

    return category, created_any


def ensure_product(models: dict[str, Any], partner: Any, seed: ProductSeed) -> tuple[Any, bool]:
    product_class, _ = ensure_product_class(models, seed.product_type)
    category, category_created = ensure_category_path(models, seed.category_path)
    product, created = models["Product"].objects.update_or_create(
        upc=seed.upc,
        defaults={
            "structure": models["Product"].STANDALONE,
            "title": seed.title,
            "slug": slugify(seed.title),
            "description": seed.description,
            "is_public": True,
            "product_class": product_class,
            "is_discountable": True,
            "code": seed.upc,
        },
    )
    product.categories.set([category])
    models["StockRecord"].objects.update_or_create(
        product=product,
        partner=partner,
        defaults={
            "partner_sku": seed.upc,
            "price_currency": "BRL",
            "price": seed.price,
            "num_in_stock": seed.stock,
            "low_stock_threshold": 2,
        },
    )
    return product, created or category_created


def ensure_user(
    models: dict[str, Any],
    country: Any,
    index: int,
    password: str,
) -> tuple[Any, bool]:
    user_data = build_user_seed(index)
    user_model = get_user_model()
    user, created = user_model.objects.get_or_create(
        username=user_data["username"],
        defaults={
            "email": user_data["email"],
            "first_name": user_data["first_name"],
            "last_name": user_data["last_name"],
            "is_active": True,
        },
    )

    updated = sync_instance(
        user,
        {
            "email": user_data["email"],
            "first_name": user_data["first_name"],
            "last_name": user_data["last_name"],
            "is_active": True,
        },
    )
    user.set_password(password)
    user.save(update_fields=["password"])

    models["UserAddress"].objects.filter(user=user).exclude(title=USER_ADDRESS_TITLE).update(
        is_default_for_shipping=False,
        is_default_for_billing=False,
    )
    address, address_created = models["UserAddress"].objects.update_or_create(
        user=user,
        title=USER_ADDRESS_TITLE,
        defaults={
            "first_name": user.first_name,
            "last_name": user.last_name,
            "line1": user_data["line1"],
            "line2": user_data["line2"],
            "line3": "",
            "line4": user_data["line4"],
            "state": user_data["state"],
            "postcode": user_data["postcode"],
            "country": country,
            "phone_number": user_data["phone_number"],
            "is_default_for_shipping": True,
            "is_default_for_billing": True,
            "notes": "Endereco gerado pelo seed de checkout.",
        },
    )
    if not address.is_default_for_shipping or not address.is_default_for_billing:
        address.is_default_for_shipping = True
        address.is_default_for_billing = True
        address.save(update_fields=["is_default_for_shipping", "is_default_for_billing"])

    return user, created or updated or address_created


@transaction.atomic
def seed_checkout_data(
    user_count: int = 3,
    password: str = "Teste@123",
) -> dict[str, Any]:
    if user_count < 1:
        raise ValueError("user_count deve ser maior que zero.")

    models = get_seed_models()
    country, country_created = ensure_country(models)
    partner, partner_created = ensure_partner(models)

    created_products = 0
    touched_products: list[dict[str, str]] = []
    for product_seed in DEFAULT_PRODUCT_SEEDS:
        product, created = ensure_product(models, partner, product_seed)
        if created:
            created_products += 1
        touched_products.append(
            {
                "title": product.title,
                "slug": product.slug,
                "upc": product.upc,
                "category": " > ".join(product_seed.category_path),
                "type": product_seed.product_type,
            }
        )

    created_users = 0
    touched_users: list[dict[str, str]] = []
    for index in range(1, user_count + 1):
        user, created = ensure_user(models, country, index, password)
        if created:
            created_users += 1
        touched_users.append(
            {
                "username": user.username,
                "email": user.email,
                "password": password,
            }
        )

    return {
        "country": {
            "code": country.iso_3166_1_a2,
            "created_or_updated": country_created,
        },
        "partner": {
            "code": partner.code,
            "created_or_updated": partner_created,
        },
        "products": touched_products,
        "users": touched_users,
        "created_products": created_products,
        "created_users": created_users,
    }
