import { getAccessToken, isAuthenticated } from "@/lib/api/auth-session";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AuthStore = {
  isAuthenticated: boolean;
  accessToken: string | null;
  lastSyncAt: number | null;
  hydrateFromSession: () => void;
  setAuthenticated: (accessToken?: string | null) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      accessToken: null,
      lastSyncAt: null,
      hydrateFromSession: () => {
        const token = getAccessToken();
        set({
          isAuthenticated: isAuthenticated(),
          accessToken: token,
          lastSyncAt: Date.now(),
        });
      },
      setAuthenticated: (token) => {
        const nextToken = token || getAccessToken();
        set({
          isAuthenticated: Boolean(nextToken),
          accessToken: nextToken || null,
          lastSyncAt: Date.now(),
        });
      },
      clearAuth: () =>
        set({
          isAuthenticated: false,
          accessToken: null,
          lastSyncAt: Date.now(),
        }),
    }),
    {
      name: "buriti_auth_store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        lastSyncAt: state.lastSyncAt,
      }),
    },
  ),
);
