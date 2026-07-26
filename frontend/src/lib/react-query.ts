import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { reportApiError, setGlobalApiErrorHandler, toApiError } from "@/lib/api/errors";

export const queryKeys = {
  products: (params?: Record<string, unknown>) =>
    ["products", params ? JSON.stringify(params) : "all"] as const,
  product: (id: number | string) => ["products", "detail", id] as const,
  categories: () => ["categories"] as const,
  cart: () => ["cart"] as const,
  countries: () => ["countries"] as const,
  paymentMethods: () => ["checkout", "payment-methods"] as const,
  orders: () => ["orders"] as const,
  order: (id: number | string) => ["orders", "detail", String(id)] as const,
  profile: () => ["profile"] as const,
  userAddresses: () => ["userAddresses"] as const,
};

setGlobalApiErrorHandler((error, source) => {
  console.error(`[api-global:${source || "unknown"}]`, error.message, {
    status: error.status,
    details: error.details,
  });
});

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          const apiError = toApiError(error);
          if (apiError.status >= 400 && apiError.status < 500) {
            return false;
          }

          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        reportApiError(error, `query:${query.queryHash}`);
      },
    }),
    mutationCache: new MutationCache(),
  });
}
