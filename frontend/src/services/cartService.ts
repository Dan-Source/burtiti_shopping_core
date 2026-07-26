import { apiClient } from "@/lib/api";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { Cart, ShippingMethod } from "@/types/api";

type AddToCartPayload = {
  productId: number;
  quantity: number;
  options?: Record<string, unknown>;
};

type UpdateCartPayload = {
  lineId: number;
  quantity: number;
};

export const cartService = {
  getCart() {
    return apiClient.get<Cart>(apiEndpoints.basket, {
      metadata: { source: "cartService.getCart" },
    });
  },

  addToCart(payload: AddToCartPayload) {
    return apiClient.post<Cart>(apiEndpoints.basketAddProduct, {
      body: {
        product_id: payload.productId,
        quantity: payload.quantity,
        options: payload.options,
      },
      metadata: { source: "cartService.addToCart" },
    });
  },

  addVoucher(code: string) {
    return apiClient.post<Cart>(apiEndpoints.basketAddVoucher, {
      body: { voucher: code },
      metadata: { source: "cartService.addVoucher" },
    });
  },

  getShippingMethods() {
    return apiClient.get<ShippingMethod[]>(apiEndpoints.basketShippingMethods, {
      metadata: { source: "cartService.getShippingMethods" },
    });
  },

  updateCart(payload: UpdateCartPayload) {
    return apiClient.patch<Cart>(`${apiEndpoints.basket}lines/${payload.lineId}/`, {
      body: {
        quantity: payload.quantity,
      },
      metadata: { source: "cartService.updateCart" },
    });
  },

  removeFromCart(lineId: number) {
    return apiClient.delete<{ success: boolean }>(`${apiEndpoints.basket}lines/${lineId}/`, {
      metadata: { source: "cartService.removeFromCart" },
    });
  },

  async clearCart(lineIds: number[]) {
    await Promise.all(
      lineIds.map((lineId) =>
        apiClient.patch<Cart>(`${apiEndpoints.basket}lines/${lineId}/`, {
          body: { quantity: 0 },
          metadata: { source: "cartService.clearCart" },
        }),
      ),
    );
  },
};
