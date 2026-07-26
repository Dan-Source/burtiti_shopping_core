import type { ProductSort, ProductViewMode } from "@/store/catalogStore";
import type { ProductFilterState } from "@/types/api";

type SearchParamsLike = {
  get: (key: string) => string | null;
};

export type ProductsListingState = {
  filters: ProductFilterState;
  sort: ProductSort;
  viewMode: ProductViewMode;
  pageSize: number;
  page: number;
};

type ProductsListingPatch = Partial<Omit<ProductsListingState, "filters">> & {
  filters?: Partial<ProductFilterState>;
};

function parseCsvParam(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumberParam(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntegerParam(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function mapSortToOrdering(sort: ProductSort) {
  switch (sort) {
    case "price-asc":
      return "price";
    case "price-desc":
      return "-price";
    case "newest":
      return "-created_at";
    case "rating":
      return "-rating";
    case "popular":
    default:
      return "-views";
  }
}

export function readSortFromUrl(value: string | null): ProductSort {
  if (value === "price-asc" || value === "price-desc" || value === "newest" || value === "rating") {
    return value;
  }

  return "popular";
}

export function readViewModeFromUrl(value: string | null): ProductViewMode {
  return value === "list" ? "list" : "grid";
}

export function readProductsListingState(
  searchParams: SearchParamsLike,
  defaults: { sort: ProductSort; viewMode: ProductViewMode; pageSize: number },
): ProductsListingState {
  return {
    filters: {
      search: searchParams.get("search") || "",
      categories: parseCsvParam(searchParams.get("categories")),
      brands: parseCsvParam(searchParams.get("brands")),
      minPrice: parseNumberParam(searchParams.get("minPrice")),
      maxPrice: parseNumberParam(searchParams.get("maxPrice")),
      rating: parseNumberParam(searchParams.get("rating")),
      inStock: searchParams.get("inStock") === "1",
      onSale: searchParams.get("onSale") === "1",
    },
    sort: readSortFromUrl(searchParams.get("sort")) || defaults.sort,
    viewMode: readViewModeFromUrl(searchParams.get("view")) || defaults.viewMode,
    pageSize: parseIntegerParam(searchParams.get("pageSize"), defaults.pageSize),
    page: parseIntegerParam(searchParams.get("page"), 1),
  };
}

export function applyListingPatch(
  current: ProductsListingState,
  patch: ProductsListingPatch,
  options?: { resetPage?: boolean },
): ProductsListingState {
  const next: ProductsListingState = {
    ...current,
    ...patch,
    filters: {
      ...current.filters,
      ...patch.filters,
    },
  };

  if (options?.resetPage) {
    next.page = 1;
  }

  return next;
}

export function buildProductsListingSearchParams(state: ProductsListingState) {
  const params = new URLSearchParams();
  const { filters } = state;

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.categories.length) {
    params.set("categories", filters.categories.join(","));
  }

  if (filters.brands.length) {
    params.set("brands", filters.brands.join(","));
  }

  if (filters.minPrice !== null) {
    params.set("minPrice", String(filters.minPrice));
  }

  if (filters.maxPrice !== null) {
    params.set("maxPrice", String(filters.maxPrice));
  }

  if (filters.rating !== null) {
    params.set("rating", String(filters.rating));
  }

  if (filters.inStock) {
    params.set("inStock", "1");
  }

  if (filters.onSale) {
    params.set("onSale", "1");
  }

  params.set("sort", state.sort);
  params.set("view", state.viewMode);
  params.set("pageSize", String(state.pageSize));
  params.set("page", String(Math.max(1, state.page)));

  return params;
}
