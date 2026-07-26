import {
  clearSessionTokens,
  getAccessToken,
  getCsrfToken,
  getRefreshToken,
  setCsrfToken,
  setSessionTokens,
} from "@/lib/api/auth-session";
import { apiEndpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { createHttpClient } from "@/lib/api/http-client";
import { env } from "@/lib/env";
import { useAuthStore } from "@/store";
import { broadcastAuthEvent } from "../auth/broadcast";

type RawTokenResponse = {
  access?: string;
  refresh?: string;
  token?: string;
};

type RawCsrfResponse = {
  csrf?: string;
  csrfToken?: string;
  token?: string;
};

let refreshPromise: Promise<string | null> | null = null;
let csrfPromise: Promise<string | null> | null = null;

function isUnsafeMethod(method?: string): boolean {
  const normalized = (method || "GET").toUpperCase();
  return (
    normalized === "POST" ||
    normalized === "PUT" ||
    normalized === "PATCH" ||
    normalized === "DELETE"
  );
}

async function fetchCsrfToken(): Promise<string | null> {
  if (csrfPromise) {
    return csrfPromise;
  }

  csrfPromise = (async () => {
    const response = await fetch(new URL(apiEndpoints.csrf, `${env.apiUrl}/`).toString(), {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as RawCsrfResponse;
    const csrfToken = payload.csrfToken || payload.csrf || payload.token || null;

    if (csrfToken) {
      setCsrfToken(csrfToken);
    }

    return csrfToken;
  })()
    .catch(() => null)
    .finally(() => {
      csrfPromise = null;
    });

  return csrfPromise;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    const response = await fetch(new URL(apiEndpoints.refreshToken, `${env.apiUrl}/`).toString(), {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as RawTokenResponse;
    const nextAccess = payload.access || payload.token;

    if (!nextAccess) {
      return null;
    }

    setSessionTokens(nextAccess, payload.refresh || refreshToken);
    useAuthStore.getState().setAuthenticated(nextAccess);
    broadcastAuthEvent({ type: "session-updated", at: Date.now() });
    return nextAccess;
  })()
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export const apiClient = createHttpClient({
  baseUrl: env.apiUrl,
  timeoutMs: env.apiTimeoutMs,
});

apiClient.addRequestInterceptor((context) => {
  const headers = new Headers(context.init.headers);
  const accessToken = getAccessToken();

  if (!context.metadata?.skipAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (!headers.has("X-Request-Source")) {
    headers.set("X-Request-Source", context.metadata?.source || "web");
  }

  if (!context.metadata?.skipCsrf && isUnsafeMethod(context.init.method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }

  return {
    ...context,
    init: {
      ...context.init,
      headers,
    },
  };
});

apiClient.addResponseInterceptor(async (context) => {
  if (context.response.status !== 401) {
    return context;
  }

  if (context.request.metadata?.skipAuth || context.request.metadata?.retried) {
    clearSessionTokens();
    throw new ApiError("Sessao expirada. Faca login novamente.", {
      status: 401,
      url: context.request.url,
      details: "Unauthorized",
    });
  }

  const refreshedToken = await refreshAccessToken();

  if (!refreshedToken) {
    clearSessionTokens();
    throw new ApiError("Sessao expirada. Faca login novamente.", {
      status: 401,
      url: context.request.url,
      details: "Unauthorized",
    });
  }

  if (!context.request.metadata?.skipCsrf && isUnsafeMethod(context.request.init.method)) {
    await fetchCsrfToken();
  }

  const headers = new Headers(context.request.init.headers);
  headers.set("Authorization", `Bearer ${refreshedToken}`);

  const retriedResponse = await fetch(context.request.url, {
    ...context.request.init,
    headers,
  });

  return {
    request: {
      ...context.request,
      metadata: {
        ...context.request.metadata,
        retried: true,
      },
      init: {
        ...context.request.init,
        headers,
      },
    },
    response: retriedResponse,
  };
});

apiClient.addRequestInterceptor(async (context) => {
  if (context.metadata?.skipCsrf || !isUnsafeMethod(context.init.method)) {
    return context;
  }

  const headers = new Headers(context.init.headers);

  if (headers.has("X-CSRF-Token")) {
    return context;
  }

  const csrfToken = getCsrfToken() || (await fetchCsrfToken());

  if (!csrfToken) {
    return context;
  }

  headers.set("X-CSRF-Token", csrfToken);

  return {
    ...context,
    init: {
      ...context.init,
      headers,
    },
  };
});
