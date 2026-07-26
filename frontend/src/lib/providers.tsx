"use client";

import { isAuthenticated } from "@/lib/api/auth-session";
import { subscribeAuthEvents } from "@/lib/auth/broadcast";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { env } from "@/lib/env";
import { createQueryClient } from "@/lib/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { useEffect, useState } from "react";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/auth/constants";
import { useQueryClient } from "@tanstack/react-query";

type ProvidersProps = {
  children: React.ReactNode;
};

function AuthSessionSync() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const hydrateFromSession = useAuthStore((state) => state.hydrateFromSession);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    hydrateFromSession();

    const unsubscribe = subscribeAuthEvents((event) => {
      if (event.type === "logout") {
        clearAuth();
        queryClient.clear();
        router.replace("/login");
      }

      if (event.type === "session-updated") {
        hydrateFromSession();
        queryClient.invalidateQueries();
      }
    });

    const onStorage = (event: StorageEvent) => {
      if (!event.key) {
        return;
      }

      if (event.key !== ACCESS_TOKEN_KEY && event.key !== REFRESH_TOKEN_KEY) {
        return;
      }

      hydrateFromSession();

      if (!isAuthenticated()) {
        queryClient.clear();
        if (pathname !== "/login" && pathname !== "/register") {
          router.replace("/login");
        }
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      unsubscribe();
    };
  }, [clearAuth, hydrateFromSession, pathname, queryClient, router]);

  return null;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionSync />
      {children}
      {env.enableQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
