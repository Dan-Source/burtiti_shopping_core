import { apiClient } from "@/lib/api";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { PaymentMethod } from "@/types/api";

export const checkoutService = {
  getPaymentMethods() {
    return apiClient.get<PaymentMethod[]>(apiEndpoints.checkoutPaymentMethods, {
      metadata: { source: "checkoutService.getPaymentMethods" },
    });
  },
};
