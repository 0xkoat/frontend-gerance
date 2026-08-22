import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionClaims } from "@/types/auth";
import { decodeJwtPayload } from "@/lib/jwt";

// The cookie holds the backend's real JWT (see route.ts handlers under app/api/auth).
// Decoding here is only for optimistic UI/redirect decisions
export const SESSION_COOKIE = "secops_token";

// Matches the backend's AuthModule JwtModule signOptions (expiresIn: '15m', since
// 2026-08-05's refresh-token migration — see backend/CLAUDE.md's "Auth: refresh token
// rotation & logout" section). The cookie should never outlive the access token itself; a
// separate refresh_token cookie (Path=/api/auth, set by the backend, relayed by
// src/app/api/auth/{login,refresh}/route.ts) is what actually extends the session past this
// window — see src/lib/backend.ts's refreshAccessToken()/backendFetchAuthed().
export const SESSION_MAX_AGE_SECONDS = 15 * 60;

export async function getSession(): Promise<SessionClaims | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeJwtPayload(token);
}

// The real access-control boundary for protected pages,call this
// from every protected page, not just the shared dashboard layout, since layouts don't
// re-run on client-side navigation between sibling routes.
//
// This also enforces the mustChangePassword gate, mirroring proxy.ts's optimistic redirect
// — proxy.ts alone is "easy to bypass in theory and shouldn't be trusted alone" per its own
// comment, so this closes the gap where requireSession() was the one boundary that didn't
// check the flag. Only /change-password itself passes allowMustChangePassword: true, since
// it has to stay reachable for the user to actually clear the flag.
export async function requireSession(
  { allowMustChangePassword = false }: { allowMustChangePassword?: boolean } = {},
): Promise<SessionClaims> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.mustChangePassword && !allowMustChangePassword) {
    redirect("/change-password");
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
