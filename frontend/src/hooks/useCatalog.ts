"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { cartService } from "@/services/cartService";
import { productService } from "@/services/productService";
import type { CategoryTree, PaginatedResponse, ProductFilters } from "@/types/api";

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.products(filters),
    queryFn: () => productService.getProducts(filters),
  });
}

export function useProductById(id: number | string) {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => productService.getProductById(id),
    enabled: Boolean(id),
  });
}

function normalizeCategories(data: CategoryTree[] | PaginatedResponse<CategoryTree>) {
  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data.results) ? data.results : [];
}

export function useCategories(pageSize = 100) {
  return useQuery({
    queryKey: [...queryKeys.categories(), pageSize],
    queryFn: async () => normalizeCategories(await productService.getCategories(pageSize)),
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["cart", "addToCart"],
    mutationFn: cartService.addToCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}
