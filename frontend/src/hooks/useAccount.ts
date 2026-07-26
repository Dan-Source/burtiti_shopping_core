"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/react-query";
import { authService } from "@/services/authService";
import { orderService } from "@/services/orderService";
import { userService } from "@/services/userService";
import type { Order } from "@/types/api";

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => userService.getProfile(),
    enabled,
  });
}

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders(),
    queryFn: () => orderService.getOrders(),
    refetchInterval: 15_000,
    select: (data): Order[] => {
      if (Array.isArray(data)) {
        return data;
      }
      return data.results || [];
    },
    retry: (failureCount, error) => {
      const apiError = toApiError(error);

      if (apiError.status === 401 || apiError.status === 403) {
        return false;
      }

      return failureCount < 1;
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "login"],
    mutationFn: authService.login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "register"],
    mutationFn: authService.register,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "logout"],
    mutationFn: () => authService.logout(),
    onSuccess: async () => {
      queryClient.clear();
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["profile", "update"],
    mutationFn: userService.updateProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
    },
  });
}
