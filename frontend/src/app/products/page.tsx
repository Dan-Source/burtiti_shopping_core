"use client";

import { FriendlyError, ProductFilters, ProductGrid, Section, Button, toast } from "@/components";
import { useAddToCart, useCategories, useProducts } from "@/hooks";
import {
  applyListingPatch,
  buildProductsListingSearchParams,
  mapSortToOrdering,
  readProductsListingState,
  type ProductsListingState,
} from "@/lib/products-query-state";
import { cn } from "@/lib/cn";
import { useCatalogStore, useWishlistStore, type ProductSort } from "@/store";
import type { CategoryTree, Product, ProductFilterState } from "@/types/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 1) {
    return [1];
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);

  for (let index = currentPage - 1; index <= currentPage + 1; index += 1) {
    if (index > 1 && index < totalPages) {
      pages.add(index);
    }
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const output: Array<number | "ellipsis"> = [];

  for (let index = 0; index < sortedPages.length; index += 1) {
    const current = sortedPages[index]!;
    const previous = sortedPages[index - 1];

    if (previous !== undefined && current - previous > 1) {
      output.push("ellipsis");
    }

    output.push(current);
  }

  return output;
}

function mapCategoryFacets(raw: CategoryTree[]) {
  return raw.slice(0, 12).map((category) => ({
    label: category.name,
    value: category.slug,
    count: category.count,
    children: Array.isArray(category.children)
      ? category.children.slice(0, 8).map((child) => ({
          label: child.name,
          value: child.slug,
          count: child.count,
        }))
      : [],
  }));
}

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const sort = useCatalogStore((state) => state.sort);
  const viewMode = useCatalogStore((state) => state.viewMode);
  const pageSize = useCatalogStore((state) => state.pageSize);
  const setSort = useCatalogStore((state) => state.setSort);
  const setViewMode = useCatalogStore((state) => state.setViewMode);
  const setPageSize = useCatalogStore((state) => state.setPageSize);

  const wishlistItems = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);

  const categoriesQuery = useCategories(100);

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [addingProductId, setAddingProductId] = useState<number | null>(null);

  const listingState = useMemo(
    () =>
      readProductsListingState(searchParams, {
        sort,
        viewMode,
        pageSize,
      }),
    [pageSize, searchParams, sort, viewMode],
  );

  const { filters, page } = listingState;

  const categoryFacets = useMemo(
    () => (Array.isArray(categoriesQuery.data) ? mapCategoryFacets(categoriesQuery.data) : []),
    [categoriesQuery.data],
  );

  // API-first requirement: while brand facets endpoint is unavailable, keep section disabled with a clear message.
  const brandFacets: Array<{ label: string; value: string; count: number }> = [];

  useEffect(() => {
    if (sort !== listingState.sort) {
      setSort(listingState.sort);
    }

    if (viewMode !== listingState.viewMode) {
      setViewMode(listingState.viewMode);
    }

    if (pageSize !== listingState.pageSize) {
      setPageSize(listingState.pageSize);
    }
  }, [
    listingState.pageSize,
    listingState.sort,
    listingState.viewMode,
    pageSize,
    setPageSize,
    setSort,
    setViewMode,
    sort,
    viewMode,
  ]);

  const products = useProducts({
    page,
    pageSize: listingState.pageSize,
    search: filters.search || undefined,
    categories: filters.categories,
    brands: filters.brands,
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    rating: filters.rating ?? undefined,
    inStock: filters.inStock ? true : undefined,
    onSale: filters.onSale ? true : undefined,
    ordering: mapSortToOrdering(listingState.sort),
  });

  const addToCart = useAddToCart();

  const currentResults = Array.isArray(products.data?.results) ? products.data.results : [];

  const totalItems = products.data?.count ?? currentResults.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / listingState.pageSize));

  const paginationItems = useMemo(() => getPaginationItems(page, totalPages), [page, totalPages]);

  const activeFilterLabels = useMemo(() => {
    const labels: Array<{ key: string; label: string }> = [];

    if (filters.search) {
      labels.push({ key: "search", label: `Busca: ${filters.search}` });
    }

    if (filters.categories.length) {
      filters.categories.forEach((item) =>
        labels.push({ key: `category:${item}`, label: `Categoria: ${item}` }),
      );
    }

    if (filters.brands.length) {
      filters.brands.forEach((item) =>
        labels.push({ key: `brand:${item}`, label: `Marca: ${item}` }),
      );
    }

    if (filters.minPrice !== null) {
      labels.push({ key: "minPrice", label: `Min: R$ ${filters.minPrice}` });
    }

    if (filters.maxPrice !== null) {
      labels.push({ key: "maxPrice", label: `Max: R$ ${filters.maxPrice}` });
    }

    if (filters.rating !== null) {
      labels.push({ key: "rating", label: `${filters.rating}+ estrelas` });
    }

    if (filters.inStock) {
      labels.push({ key: "inStock", label: "Em estoque" });
    }

    if (filters.onSale) {
      labels.push({ key: "onSale", label: "Em oferta" });
    }

    return labels;
  }, [filters]);

  const commitListingPatch = useCallback(
    (
      patch: Partial<Omit<ProductsListingState, "filters">> & {
        filters?: Partial<ProductFilterState>;
      },
      options?: { resetPage?: boolean },
    ) => {
      const nextState = applyListingPatch(listingState, patch, options);
      const params = buildProductsListingSearchParams(nextState);
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [listingState, pathname, router],
  );

  const goToPage = useCallback(
    (nextPage: number) => {
      const clamped = Math.min(Math.max(nextPage, 1), totalPages);
      commitListingPatch({ page: clamped });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [commitListingPatch, totalPages],
  );

  function updateSort(nextSort: ProductSort) {
    setSort(nextSort);
    commitListingPatch({ sort: nextSort }, { resetPage: true });
  }

  function toggleCategory(value: string) {
    const exists = filters.categories.includes(value);
    const categories = exists
      ? filters.categories.filter((item) => item !== value)
      : [...filters.categories, value];
    commitListingPatch({ filters: { categories } }, { resetPage: true });
  }

  function toggleBrand(value: string) {
    const exists = filters.brands.includes(value);
    const brands = exists
      ? filters.brands.filter((item) => item !== value)
      : [...filters.brands, value];
    commitListingPatch({ filters: { brands } }, { resetPage: true });
  }

  function removeFilterByKey(key: string) {
    if (key.startsWith("category:")) {
      const category = key.replace("category:", "");
      commitListingPatch(
        { filters: { categories: filters.categories.filter((item) => item !== category) } },
        { resetPage: true },
      );
      return;
    }

    if (key.startsWith("brand:")) {
      const brand = key.replace("brand:", "");
      commitListingPatch(
        { filters: { brands: filters.brands.filter((item) => item !== brand) } },
        { resetPage: true },
      );
      return;
    }

    if (key === "search") {
      commitListingPatch({ filters: { search: "" } }, { resetPage: true });
      return;
    }

    if (key === "minPrice") {
      commitListingPatch({ filters: { minPrice: null } }, { resetPage: true });
      return;
    }

    if (key === "maxPrice") {
      commitListingPatch({ filters: { maxPrice: null } }, { resetPage: true });
      return;
    }

    if (key === "rating") {
      commitListingPatch({ filters: { rating: null } }, { resetPage: true });
      return;
    }

    if (key === "inStock") {
      commitListingPatch({ filters: { inStock: false } }, { resetPage: true });
      return;
    }

    if (key === "onSale") {
      commitListingPatch({ filters: { onSale: false } }, { resetPage: true });
    }
  }

  function resetAllFilters() {
    commitListingPatch(
      {
        filters: {
          search: "",
          categories: [],
          brands: [],
          minPrice: null,
          maxPrice: null,
          rating: null,
          inStock: false,
          onSale: false,
        },
      },
      { resetPage: true },
    );
  }

  async function handleAddToCart(product: Product) {
    if (!product.id) {
      return;
    }

    setAddingProductId(product.id);
    try {
      await addToCart.mutateAsync({ productId: product.id, quantity: 1 });
      toast.success("Produto adicionado ao carrinho!", "O item foi enviado para o seu carrinho.");
    } catch {
      toast.error("Erro ao adicionar ao carrinho", "Tente novamente em alguns instantes.");
    } finally {
      setAddingProductId(null);
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && page < totalPages) {
        goToPage(page + 1);
      }

      if (event.key === "ArrowLeft" && page > 1) {
        goToPage(page - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToPage, page, totalPages]);

  return (
    <Section className="space-y-5 py-6">
      <ProductFilters
        filters={filters}
        sort={listingState.sort}
        activeFilterLabels={activeFilterLabels}
        isMobileOpen={isMobileFiltersOpen}
        categories={categoryFacets}
        brands={brandFacets}
        hasBrandFacets={false}
        onPatchFilters={(patch) => commitListingPatch({ filters: patch }, { resetPage: true })}
        onToggleCategory={toggleCategory}
        onToggleBrand={toggleBrand}
        onSetSort={updateSort}
        onRemoveFilterByKey={removeFilterByKey}
        onResetAll={resetAllFilters}
        onOpenMobile={() => setIsMobileFiltersOpen(true)}
        onCloseMobile={() => setIsMobileFiltersOpen(false)}
      />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <ProductFilters
          variant="sidebar"
          filters={filters}
          sort={listingState.sort}
          activeFilterLabels={activeFilterLabels}
          isMobileOpen={isMobileFiltersOpen}
          categories={categoryFacets}
          brands={brandFacets}
          hasBrandFacets={false}
          onPatchFilters={(patch) => commitListingPatch({ filters: patch }, { resetPage: true })}
          onToggleCategory={toggleCategory}
          onToggleBrand={toggleBrand}
          onSetSort={updateSort}
          onRemoveFilterByKey={removeFilterByKey}
          onResetAll={resetAllFilters}
          onOpenMobile={() => setIsMobileFiltersOpen(true)}
          onCloseMobile={() => setIsMobileFiltersOpen(false)}
        />

        <div className="space-y-4">
          {products.isError ? (
            <FriendlyError
              title="Erro ao carregar produtos"
              description="Nao foi possivel buscar os itens no momento."
              onRetry={() => products.refetch()}
            />
          ) : null}

          {!products.isError ? (
            <ProductGrid
              products={currentResults}
              viewMode={listingState.viewMode}
              wishlistedIds={wishlistItems}
              addingProductId={addingProductId}
              isLoading={products.isLoading}
              onToggleWishlist={toggleWishlist}
              onAddToCart={handleAddToCart}
            />
          ) : null}

          <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
            <div className="text-sm text-zinc-600">
              Página {page} de {totalPages}
              <span className="ml-2 text-zinc-400">{activeFilterLabels.length} filtros ativos</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || products.isLoading}
                aria-label="Pagina anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {paginationItems.map((item, index) => {
                if (item === "ellipsis") {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-2 text-sm text-zinc-500"
                      aria-hidden
                    >
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={`page-${item}`}
                    type="button"
                    onClick={() => goToPage(item)}
                    className={cn(
                      "h-9 min-w-9 rounded-lg border px-2 text-sm",
                      page === item
                        ? "border-zinc-900 bg-zinc-900 font-semibold text-white"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100",
                    )}
                    aria-current={page === item ? "page" : undefined}
                    aria-label={`Ir para pagina ${item}`}
                  >
                    {item}
                  </button>
                );
              })}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages || products.isLoading}
                aria-label="Proxima pagina"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<Section className="py-6">Carregando...</Section>}>
      <ProductsPageContent />
    </Suspense>
  );
}
