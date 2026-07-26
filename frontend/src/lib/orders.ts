import type { Order } from "@/types/api";

export function getOrderId(order: Order): string | number {
  if (order.id) {
    return order.id;
  }

  const match = String(order.url || "").match(/\/api\/orders\/(\d+)\/?$/);
  if (match?.[1]) {
    return match[1];
  }

  return String(order.number || "");
}
