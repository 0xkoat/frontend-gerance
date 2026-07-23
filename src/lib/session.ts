import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionClaims } from "@/types/auth";
import { decodeJwtPayload } from "@/lib/jwt";

// The cookie holds the backend's real JWT (see route.ts handlers under app/api/auth).
// Decoding here is only for optimistic UI/redirect decisions
export const SESSION_COOKIE = "secops_token";

// Matches the backend's JwtModule signOptions (expiresIn: '1h') — no refresh tokens exist
// in this API, so the cookie should never outlive the token itself.
export const SESSION_MAX_AGE_SECONDS = 60 * 60;

export async function getSession(): Promise<SessionClaims | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeJwtPayload(token);
}

// The real access-control boundary for protected pages,call this
// from every protected page, not just the shared dashboard layout, since layouts don't
// re-run on client-side navigation between sibling routes.
export async function requireSession(): Promise<SessionClaims> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function getToken(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ?? null;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
