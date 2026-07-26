import { create } from "zustand";
export { useAuthStore } from "@/store/authStore";
export { useCatalogStore } from "@/store/catalogStore";
export { useCheckoutStore } from "@/store/checkoutStore";
export { useWishlistStore } from "@/store/wishlistStore";
export type { ProductSort, ProductViewMode } from "@/store/catalogStore";

type AppStore = {
  initialized: boolean;
  setInitialized: (value: boolean) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  initialized: false,
  setInitialized: (value) => set({ initialized: value }),
}));
