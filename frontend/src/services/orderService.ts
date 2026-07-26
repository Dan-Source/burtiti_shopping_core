import { apiClient } from "@/lib/api";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { CreateOrderPayload, Order, PaginatedResponse } from "@/types/api";

export const orderService = {
  createOrder(payload: CreateOrderPayload) {
    return apiClient.post<Order>(apiEndpoints.checkout, {
      body: payload,
      metadata: { source: "orderService.createOrder" },
    });
  },

  getOrders() {
    return apiClient.get<Order[] | PaginatedResponse<Order>>(apiEndpoints.orders, {
      metadata: { source: "orderService.getOrders" },
    });
  },

  getOrderById(id: number | string) {
    return apiClient.get<Order>(`${apiEndpoints.orders}${id}/`, {
      metadata: { source: "orderService.getOrderById" },
    });
  },
};
