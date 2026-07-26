import type { Order } from "@/types/api";

export function normalizePixStatus(order?: Order): "pending" | "paid" | "expired" {
  const value = String(order?.payment_status || order?.status || "").toLowerCase();

  if (value === "paid" || value === "complete" || value === "completed") {
    return "paid";
  }

  if (value === "expired" || value === "canceled" || value === "cancelled" || value === "failed") {
    return "expired";
  }

  return "pending";
}

export function isPixMethod(code: string) {
  return code.toLowerCase().includes("pix");
}

export function isCashMethod(code: string) {
  return code.toLowerCase().includes("cash");
}

export function getQrCodeImageSource(input?: string | null) {
  if (!input) {
    return "";
  }

  const value = input.trim();
  if (
    value.startsWith("data:image/") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return "";
}
