from __future__ import annotations

from typing import Any

from django.db.models import OuterRef, Q, Subquery, Value
from django.utils import timezone
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiResponse, extend_schema
from oscar.core.loading import get_model
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from api.products.serializers import (
    CategoryQueryParamsSerializer,
    CategoryTreeSerializer,
    ErrorSerializer,
    PaginatedProductsSerializer,
    ProductDetailSerializer,
    ProductListItemSerializer,
    ProductListQueryParamsSerializer,
    split_csv,
)

Product = get_model("catalogue", "Product")
Category = get_model("catalogue", "Category")
ConditionalOffer = get_model("offer", "ConditionalOffer")
StockRecord = get_model("partner", "StockRecord")

BRAND_ATTRIBUTE_CODES = {"brand", "marca", "fabricante"}


class ProductPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class ProductContractErrorMixin:
    def bad_request(self, detail: str, code: str = "invalid_parameters") -> Response:
        return Response({"detail": detail, "code": code}, status=status.HTTP_400_BAD_REQUEST)


class ProductOfferMixin:
    def _active_offers_queryset(self):
        now = timezone.now()
        return (
            ConditionalOffer.objects.select_related("condition__range", "benefit", "benefit__range")
            .filter(status=ConditionalOffer.OPEN, start_datetime__lte=now)
            .filter(Q(end_datetime__isnull=True) | Q(end_datetime__gte=now))
        )

    def _offer_applies_to_product(self, offer: Any, product: Product) -> bool:
        ranges = []
        if getattr(offer, "condition", None) and offer.condition.range:
            ranges.append(offer.condition.range)
        if getattr(offer, "benefit", None) and offer.benefit.range:
            ranges.append(offer.benefit.range)

        if not ranges:
            return False

        return any(offer_range.contains_product(product) for offer_range in ranges)

    def build_active_offers_map(self, products: list[Product]) -> dict[int, list[Any]]:
        offers = list(self._active_offers_queryset())
        if not offers or not products:
            return {}

        result: dict[int, list[Any]] = {}
        for product in products:
            applicable = [offer for offer in offers if self._offer_applies_to_product(offer, product)]
            if applicable:
                result[product.id] = applicable
        return result

    def on_sale_product_ids(self, products_queryset):
        offers = list(self._active_offers_queryset())
        if not offers:
            return []

        product_ids: set[int] = set()
        for product in products_queryset:
            if any(self._offer_applies_to_product(offer, product) for offer in offers):
                product_ids.add(product.id)

        return list(product_ids)


class ProductCategoryMixin:
    def _category_count(self, category: Any) -> int:
        return (
            Product.objects.filter(is_public=True, categories__path__startswith=category.path)
            .distinct()
            .count()
        )

    def _category_image(self, category: Any, request) -> str | None:
        if not category.image:
            return None
        if request:
            return request.build_absolute_uri(category.image.url)
        return category.image.url

    def _build_category_tree(self, category: Any, request) -> dict[str, Any]:
        children = category.get_children().filter(is_public=True)
        return {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
            "description": category.description or "",
            "image": self._category_image(category, request),
            "count": self._category_count(category),
            "children": [self._build_category_tree(child, request) for child in children],
        }


class ProductListAPIView(ProductOfferMixin, ProductContractErrorMixin, APIView):
    pagination_class = ProductPagination

    def get_queryset(self):
        base_qs = (
            Product.objects.filter(is_public=True)
            .select_related("product_class")
            .prefetch_related("categories", "images", "stockrecords", "attribute_values__attribute")
            .distinct()
        )

        min_price_subquery = StockRecord.objects.filter(product=OuterRef("pk")).order_by("price").values("price")[:1]

        return base_qs.annotate(
            sort_price=Subquery(min_price_subquery),
            views_count=Value(0),
        )

    def _apply_filters(self, queryset, filters: dict[str, Any]):
        if search := filters.get("search"):
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(upc__icontains=search)
                | Q(code__icontains=search)
            )

        if category := filters.get("category"):
            queryset = queryset.filter(categories__slug=category)

        categories = split_csv(filters.get("categories"))
        if categories:
            queryset = queryset.filter(categories__slug__in=categories)

        min_price = filters.get("min_price")
        if min_price is not None:
            queryset = queryset.filter(stockrecords__price__gte=min_price)

        max_price = filters.get("max_price")
        if max_price is not None:
            queryset = queryset.filter(stockrecords__price__lte=max_price)

        rating = filters.get("rating")
        if rating is not None:
            queryset = queryset.filter(rating__gte=rating)

        if filters.get("in_stock"):
            queryset = queryset.filter(stockrecords__num_in_stock__gt=0)

        brands = split_csv(filters.get("brands"))
        if brands:
            brand_query = Q()
            for brand in brands:
                brand_query |= Q(attribute_values__value_text__iexact=brand)
            queryset = queryset.filter(
                brand_query,
                Q(attribute_values__attribute__code__in=BRAND_ATTRIBUTE_CODES)
                | Q(attribute_values__attribute__name__iregex=r"^(brand|marca|fabricante)$"),
            )

        if filters.get("on_sale"):
            on_sale_ids = self.on_sale_product_ids(queryset)
            if not on_sale_ids:
                return queryset.none()
            queryset = queryset.filter(id__in=on_sale_ids)

        return queryset.distinct()

    def _apply_ordering(self, queryset, ordering_value: str):
        order_map = {
            "price": "sort_price",
            "-price": "-sort_price",
            "created_at": "date_created",
            "-created_at": "-date_created",
            "rating": "rating",
            "-rating": "-rating",
            "title": "title",
            "-title": "-title",
            "views": "views_count",
            "-views": "-views_count",
        }
        selected_ordering = order_map.get(ordering_value, "-date_created")
        return queryset.order_by(selected_ordering, "-id")

    @extend_schema(
        operation_id="listProducts",
        summary="Listar / buscar produtos",
        description=(
            "Retorna produtos com paginacao. Todos os parametros sao opcionais. "
            "Combinacoes de filtros funcionam como AND."
        ),
        parameters=[
            OpenApiParameter(name="page", type=int, location=OpenApiParameter.QUERY, description="Numero da pagina (comeca em 1)"),
            OpenApiParameter(name="page_size", type=int, location=OpenApiParameter.QUERY, description="Itens por pagina"),
            OpenApiParameter(name="search", type=str, location=OpenApiParameter.QUERY, description="Busca textual (nome, descricao, referencia)"),
            OpenApiParameter(name="category", type=str, location=OpenApiParameter.QUERY, description="Slug da categoria para filtro exato"),
            OpenApiParameter(
                name="categories",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Slugs de categorias separados por virgula (OR)",
                examples=[OpenApiExample("Categorias exemplo", value="eletronicos,smartphones")],
            ),
            OpenApiParameter(name="min_price", type=float, location=OpenApiParameter.QUERY, description="Preco minimo (incl_tax)"),
            OpenApiParameter(name="max_price", type=float, location=OpenApiParameter.QUERY, description="Preco maximo (incl_tax)"),
            OpenApiParameter(name="rating", type=float, location=OpenApiParameter.QUERY, description="Avaliacao minima (1-5)"),
            OpenApiParameter(
                name="brands",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Marcas separadas por virgula (OR)",
                examples=[OpenApiExample("Marcas exemplo", value="samsung,xiaomi")],
            ),
            OpenApiParameter(name="in_stock", type=bool, location=OpenApiParameter.QUERY, description="Apenas produtos com estoque > 0"),
            OpenApiParameter(name="on_sale", type=bool, location=OpenApiParameter.QUERY, description="Apenas produtos com desconto ativo"),
            OpenApiParameter(
                name="ordering",
                type=str,
                location=OpenApiParameter.QUERY,
                enum=["price", "-price", "created_at", "-created_at", "rating", "-rating", "title", "-title", "views", "-views"],
                description="Campo para ordenacao. Prefixo '-' indica ordem decrescente.",
            ),
        ],
        responses={
            200: OpenApiResponse(response=PaginatedProductsSerializer, description="Lista paginada de produtos"),
            400: OpenApiResponse(response=ErrorSerializer, description="Parametros invalidos"),
        },
    )
    def get(self, request):
        serializer = ProductListQueryParamsSerializer(data=request.query_params)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))
            error_message = first_error[0] if isinstance(first_error, list) else str(first_error)
            return self.bad_request(error_message)

        filters = serializer.validated_data
        queryset = self._apply_filters(self.get_queryset(), filters)
        queryset = self._apply_ordering(queryset, filters.get("ordering", "-created_at"))

        paginator = self.pagination_class()
        paginated = paginator.paginate_queryset(queryset, request, view=self)
        page_items = list(paginated)

        context = {
            "request": request,
            "active_offers_map": self.build_active_offers_map(page_items),
        }
        data = ProductListItemSerializer(page_items, many=True, context=context).data
        return paginator.get_paginated_response(data)


class ProductDetailAPIView(ProductOfferMixin, APIView):
    @extend_schema(
        operation_id="retrieveProduct",
        summary="Detalhes do produto",
        description="Retorna informacoes completas de um produto especifico.",
        responses={
            200: OpenApiResponse(response=ProductDetailSerializer, description="Dados completos do produto"),
            404: OpenApiResponse(response=ErrorSerializer, description="Produto nao encontrado"),
        },
    )
    def get(self, request, id: int):
        product = (
            Product.objects.filter(is_public=True, id=id)
            .prefetch_related("categories", "images", "stockrecords", "attribute_values__attribute")
            .first()
        )
        if product is None:
            return Response({"detail": "Produto nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

        context = {
            "request": request,
            "active_offers_map": self.build_active_offers_map([product]),
        }
        data = ProductDetailSerializer(product, context=context).data
        return Response(data, status=status.HTTP_200_OK)


class CategoryTreeListAPIView(ProductCategoryMixin, ProductContractErrorMixin, APIView):
    @extend_schema(
        operation_id="listCategories",
        summary="Listar categorias",
        description="Retorna arvore de categorias disponiveis.",
        parameters=[
            OpenApiParameter(name="page_size", type=int, location=OpenApiParameter.QUERY, description="Quantidade de categorias raiz"),
        ],
        responses={200: OpenApiResponse(response=CategoryTreeSerializer(many=True), description="Lista de categorias")},
    )
    def get(self, request):
        serializer = CategoryQueryParamsSerializer(data=request.query_params)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))
            error_message = first_error[0] if isinstance(first_error, list) else str(first_error)
            return self.bad_request(error_message)

        page_size = serializer.validated_data.get("page_size", 100)
        roots = Category.get_root_nodes().filter(is_public=True).order_by("name")[:page_size]
        payload = [self._build_category_tree(category, request) for category in roots]
        return Response(CategoryTreeSerializer(payload, many=True, context={"request": request}).data)
