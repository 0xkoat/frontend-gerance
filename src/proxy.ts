import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwtPayload } from "@/lib/jwt";
import { SESSION_COOKIE } from "@/lib/session";


// This is a UX convenience, NOT the security boundary — it only reads the cookie and
// decodes it without verifying the signature (Proxy has no access to JWT_SECRET, and
// shouldn't). Every real authorization decision is enforced server-side by the NestJS
// guards (JwtAuthGuard, RolesGuard, MustChangePasswordGuard) on every actual data request.
// This just avoids flashing protected UI at a logged-out visitor and centralizes the
// redirect logic, per Next's own "Optimistic checks with Proxy" guidance in the
// authentication guide.

const PUBLIC_ROUTES = ["/login", "/forgot-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? decodeJwtPayload(token) : null;

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (session?.mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets, generated icons, and the API routes . `icon` covers the
  // src/app/icon.tsx-generated favicon route — missing it here meant an unauthenticated
  // visitor's favicon request got redirected to /login instead of returning the icon,
  // breaking the tab icon on every public page including /login itself.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon).*)"],
};
