"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { addressService } from "@/services/addressService";
import { cartService } from "@/services/cartService";
import { checkoutService } from "@/services/checkoutService";
import { orderService } from "@/services/orderService";
import { useAuthStore } from "@/store";
import type { CreateAddressPayload, Order, UserAddress } from "@/types/api";

function isOrderTerminal(status?: string) {
  const normalized = String(status || "").toLowerCase();

  return (
    normalized === "paid" ||
    normalized === "complete" ||
    normalized === "completed" ||
    normalized === "expired"
  );
}

export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart(),
    queryFn: () => cartService.getCart(),
  });
}

export function useUpdateCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["cart", "update"],
    mutationFn: cartService.updateCart,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["cart", "remove"],
    mutationFn: cartService.removeFromCart,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["cart", "clear"],
    mutationFn: cartService.clearCart,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}

export function useAddVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["cart", "voucher"],
    mutationFn: cartService.addVoucher,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}

export function useShippingMethods() {
  return useQuery({
    queryKey: ["cart", "shippingMethods"],
    queryFn: () => cartService.getShippingMethods(),
  });
}

export function useCheckoutCountries() {
  return useQuery({
    queryKey: queryKeys.countries(),
    queryFn: () => addressService.getCountries(),
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods(),
    queryFn: () => checkoutService.getPaymentMethods(),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["orders", "create"],
    mutationFn: orderService.createOrder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}

export function useUserAddresses() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.userAddresses(),
    queryFn: () => addressService.getUserAddresses(),
    enabled: isAuthenticated,
    select: (data): UserAddress[] => {
      if (Array.isArray(data)) {
        return data;
      }
      return data.results || [];
    },
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["addresses", "create"],
    mutationFn: addressService.createAddress,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.userAddresses() });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["addresses", "update"],
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateAddressPayload> }) =>
      addressService.updateAddress(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.userAddresses() });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["addresses", "delete"],
    mutationFn: addressService.deleteAddress,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.userAddresses() });
    },
  });
}

export function useAddressesCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["addresses", "count"],
    queryFn: () => addressService.getAddressesCount(),
    enabled: isAuthenticated,
  });
}

export function useOrderById(
  id: number | string,
  options?: { enablePolling?: boolean; pollIntervalMs?: number },
) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => orderService.getOrderById(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      if (!options?.enablePolling) {
        return false;
      }

      const order = query.state.data as Order | undefined;
      if (!order || isOrderTerminal(order.payment_status || order.status)) {
        return false;
      }

      return options.pollIntervalMs || 5000;
    },
  });
}
