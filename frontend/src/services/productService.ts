import { apiClient } from "@/lib/api";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { CategoryTree, PaginatedResponse, Product, ProductFilters } from "@/types/api";

function mapProductFilters(filters?: ProductFilters) {
  if (!filters) {
    return undefined;
  }

  const categories = filters.categories?.length ? filters.categories.join(",") : undefined;
  const brands = filters.brands?.length ? filters.brands.join(",") : undefined;

  return {
    page: filters.page,
    page_size: filters.pageSize,
    search: filters.search,
    category: filters.category,
    categories,
    min_price: filters.minPrice,
    max_price: filters.maxPrice,
    rating: filters.rating,
    brands,
    in_stock: filters.inStock,
    on_sale: filters.onSale,
    ordering: filters.ordering,
  };
}

export const productService = {
  getProducts(filters?: ProductFilters) {
    return apiClient.get<PaginatedResponse<Product>>(apiEndpoints.products, {
      query: mapProductFilters(filters),
      metadata: { source: "productService.getProducts" },
    });
  },

  getProductById(id: number | string) {
    return apiClient.get<Product>(`${apiEndpoints.products}${id}/`, {
      metadata: { source: "productService.getProductById" },
    });
  },

  getCategories(pageSize = 100) {
    return apiClient.get<CategoryTree[] | PaginatedResponse<CategoryTree>>(
      apiEndpoints.categories,
      {
        query: { page_size: pageSize },
        metadata: { source: "productService.getCategories" },
      },
    );
  },

  searchProducts(query: string, filters?: Omit<ProductFilters, "search">) {
    return this.getProducts({ ...filters, search: query });
  },
};
