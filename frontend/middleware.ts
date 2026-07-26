import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "./src/lib/auth/constants";

const AUTH_ROUTES = new Set(["/login", "/register"]);
const PROTECTED_PREFIXES = ["/account", "/checkout", "/orders"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);

  if (AUTH_ROUTES.has(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  if (isProtectedPath(pathname) && !hasSession) {
    const target = new URL("/login", request.url);
    target.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/account/:path*", "/checkout/:path*", "/orders/:path*"],
};
