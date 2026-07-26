"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type WishlistStore = {
  items: number[];
  toggleItem: (productId: number) => void;
  isWishlisted: (productId: number) => boolean;
};

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggleItem: (productId) => {
        const exists = get().items.includes(productId);
        set({
          items: exists
            ? get().items.filter((id) => id !== productId)
            : [...get().items, productId],
        });
      },
      isWishlisted: (productId) => get().items.includes(productId),
    }),
    {
      name: "buriti_wishlist_store",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
