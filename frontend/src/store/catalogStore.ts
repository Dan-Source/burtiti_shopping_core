"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ProductSort = "popular" | "price-asc" | "price-desc" | "newest" | "rating";
export type ProductViewMode = "grid" | "list";

type CatalogStore = {
  sort: ProductSort;
  viewMode: ProductViewMode;
  pageSize: number;
  setSort: (sort: ProductSort) => void;
  setViewMode: (mode: ProductViewMode) => void;
  setPageSize: (size: number) => void;
};

export const useCatalogStore = create<CatalogStore>()(
  persist(
    (set) => ({
      sort: "popular",
      viewMode: "grid",
      pageSize: 12,
      setSort: (sort) => set({ sort }),
      setViewMode: (viewMode) => set({ viewMode }),
      setPageSize: (pageSize) => set({ pageSize }),
    }),
    {
      name: "buriti_catalog_store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sort: state.sort,
        viewMode: state.viewMode,
        pageSize: state.pageSize,
      }),
    },
  ),
);
