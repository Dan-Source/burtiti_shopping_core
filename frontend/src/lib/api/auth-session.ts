import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_KEY,
  CSRF_TOKEN_COOKIE,
  CSRF_TOKEN_KEY,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_KEY,
} from "@/lib/auth/constants";

function hasWindow() {
  return typeof window !== "undefined";
}

function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 7) {
  if (!hasWindow()) {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function getCookie(name: string): string | null {
  if (!hasWindow()) {
    return null;
  }

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(prefix.length));
}

function deleteCookie(name: string) {
  if (!hasWindow()) {
    return;
  }

  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

export function getAccessToken(): string | null {
  if (!hasWindow()) {
    return null;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY) || getCookie(ACCESS_TOKEN_COOKIE);
}

export function getRefreshToken(): string | null {
  if (!hasWindow()) {
    return null;
  }

  return localStorage.getItem(REFRESH_TOKEN_KEY) || getCookie(REFRESH_TOKEN_COOKIE);
}

export function getCsrfToken(): string | null {
  if (!hasWindow()) {
    return null;
  }

  return localStorage.getItem(CSRF_TOKEN_KEY) || getCookie(CSRF_TOKEN_COOKIE);
}

export function setSessionTokens(accessToken?: string, refreshToken?: string) {
  if (!hasWindow()) {
    return;
  }

  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    setCookie(ACCESS_TOKEN_COOKIE, accessToken);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setCookie(REFRESH_TOKEN_COOKIE, refreshToken);
  }
}

export function setCsrfToken(token?: string) {
  if (!hasWindow() || !token) {
    return;
  }

  localStorage.setItem(CSRF_TOKEN_KEY, token);
  setCookie(CSRF_TOKEN_COOKIE, token);
}

export function clearSessionTokens() {
  if (!hasWindow()) {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(CSRF_TOKEN_KEY);

  deleteCookie(ACCESS_TOKEN_COOKIE);
  deleteCookie(REFRESH_TOKEN_COOKIE);
  deleteCookie(CSRF_TOKEN_COOKIE);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}
