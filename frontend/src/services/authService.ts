import { clearSessionTokens, getRefreshToken, setSessionTokens } from "@/lib/api/auth-session";
import { apiEndpoints } from "@/lib/api/endpoints";
import { apiClient } from "@/lib/api";
import { broadcastAuthEvent } from "@/lib/auth/broadcast";
import { useAuthStore } from "@/store";
import type {
  AuthTokens,
  LoginPayload,
  RefreshTokenPayload,
  RegisterPayload,
  UserProfile,
} from "@/types/api";

type RawLoginResponse =
  | AuthTokens
  | {
      token?: string;
      access?: string;
      refresh?: string;
    };

function normalizeTokens(tokens: RawLoginResponse): AuthTokens {
  const access = "access" in tokens ? tokens.access : undefined;
  const refresh = "refresh" in tokens ? tokens.refresh : undefined;
  const fallbackToken = "token" in tokens ? tokens.token : undefined;

  if (!access && !fallbackToken) {
    throw new Error("Login response did not include access credentials");
  }

  return {
    access: access || fallbackToken || "",
    refresh,
  };
}

function hasTokenShape(data: unknown): data is RawLoginResponse {
  if (!data || typeof data !== "object") {
    return false;
  }

  return "access" in data || "token" in data || "refresh" in data;
}

export const authService = {
  async login(payload: LoginPayload) {
    const loginResult = await apiClient.post<unknown>(apiEndpoints.loginWithToken, {
      body: payload,
      metadata: { source: "authService.login", skipAuth: true },
    });

    if (hasTokenShape(loginResult)) {
      const normalized = normalizeTokens(loginResult);
      setSessionTokens(normalized.access, normalized.refresh);
      useAuthStore.getState().setAuthenticated(normalized.access);
      broadcastAuthEvent({ type: "session-updated", at: Date.now() });
      return normalized;
    }

    // Oscar login is session-based and may not return JWT tokens.
    setSessionTokens("session-authenticated", undefined);
    useAuthStore.getState().setAuthenticated("session-authenticated");
    broadcastAuthEvent({ type: "session-updated", at: Date.now() });
    return { access: "session-authenticated" };
  },

  async logout() {
    try {
      await apiClient.delete<unknown>(apiEndpoints.logout, {
        metadata: { source: "authService.logout", skipCsrf: true },
      });
    } catch {
      // Logout should always clear local session even if API call fails.
    }

    clearSessionTokens();
    useAuthStore.getState().clearAuth();
    broadcastAuthEvent({ type: "logout", at: Date.now() });
  },

  async register(payload: RegisterPayload) {
    const result = await apiClient.post<UserProfile | RawLoginResponse>(apiEndpoints.register, {
      body: payload,
      metadata: { source: "authService.register", skipAuth: true },
    });

    if (typeof result === "object" && result !== null && hasTokenShape(result)) {
      const normalized = normalizeTokens(result as RawLoginResponse);
      setSessionTokens(normalized.access, normalized.refresh);
      useAuthStore.getState().setAuthenticated(normalized.access);
      broadcastAuthEvent({ type: "session-updated", at: Date.now() });
    }

    return result;
  },

  async refreshToken(payload?: RefreshTokenPayload) {
    const refresh = payload?.refresh || getRefreshToken();

    if (!refresh) {
      throw new Error("Refresh token indisponivel");
    }

    const tokens = await apiClient.post<RawLoginResponse>(apiEndpoints.refreshToken, {
      body: { refresh },
      metadata: { source: "authService.refreshToken", skipAuth: true, skipCsrf: true },
    });

    const normalized = normalizeTokens(tokens);
    setSessionTokens(normalized.access, normalized.refresh || refresh);
    useAuthStore.getState().setAuthenticated(normalized.access);
    broadcastAuthEvent({ type: "session-updated", at: Date.now() });
    return normalized;
  },
};
