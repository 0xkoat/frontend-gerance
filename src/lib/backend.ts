import "server-only";
import { cookies } from "next/headers";
import { getToken, setSessionCookie } from "@/lib/session";

// Server-only: never fetch the backend directly from a Client Component. Route Handlers
// under src/app/api/** are the only thing allowed to call the refresh-capable
// backendFetchAuthed below — they act as a thin proxy that attaches the httpOnly-cookie-held
// token as an Authorization header, so the raw JWT never has to touch client-side JS.
const BACKEND_URL = process.env.BACKEND_URL;

if (!BACKEND_URL) {
  throw new Error("BACKEND_URL environment variable is not defined");
}

// Mirrors backend/src/auth/auth.controller.ts's REFRESH_TOKEN_COOKIE / _PATH constants —
// keep these in sync if the backend ever changes either.
const REFRESH_TOKEN_COOKIE = "refresh_token";
const REFRESH_TOKEN_COOKIE_PATH = "/api/auth";

export interface BackendErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export async function backendFetch(path: string, init: RequestInit = {}) {
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
}

// The browser's own refresh_token cookie (Path=/api/auth) — sent along with any request to
// this app's own /api/auth/* routes, since they share that path prefix with the backend's.
// Forwarded to the backend's POST /auth/refresh and POST /auth/logout as a Cookie header on
// the server-to-server fetch; the backend never sees the browser's original request.
export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
}

// Parses the `refresh_token=...` Set-Cookie header off a backend auth response (login or
// refresh) and re-applies it as the browser's own cookie via next/headers' cookies().set().
// This is the one relay mechanism shared by every call site that receives a rotated refresh
// token — cookies().set() is the only API that still works when the caller is nested inside
// a Route Handler's call stack without holding a NextResponse object of its own (see
// refreshAccessToken() below, called from deep inside backendFetchAuthed's retry path).
// Requires Headers.getSetCookie() (verified available on this project's Node 22 runtime —
// a plain headers.get("set-cookie") would comma-join multiple Set-Cookie headers into one
// unparseable string on some fetch implementations).
export async function applyRefreshCookie(backendRes: Response): Promise<void> {
  const setCookieHeaders = backendRes.headers.getSetCookie();
  const refreshCookie = setCookieHeaders.find((header) =>
    header.startsWith(`${REFRESH_TOKEN_COOKIE}=`),
  );
  if (!refreshCookie) return;

  const [pair, ...attributes] = refreshCookie.split("; ");
  const value = pair.slice(`${REFRESH_TOKEN_COOKIE}=`.length);
  const expiresAttr = attributes.find((attr) =>
    attr.toLowerCase().startsWith("expires="),
  );
  const expires = expiresAttr
    ? new Date(expiresAttr.slice("expires=".length))
    : undefined;

  (await cookies()).set(REFRESH_TOKEN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_TOKEN_COOKIE_PATH,
    expires,
  });
}

export async function clearRefreshCookie(): Promise<void> {
  (await cookies()).delete({
    name: REFRESH_TOKEN_COOKIE,
    path: REFRESH_TOKEN_COOKIE_PATH,
  });
}

// Calls the backend's POST /auth/refresh using the browser's own refresh_token cookie,
// rotating both the access-token session cookie and the refresh_token cookie on success.
// Returns null if there's no refresh cookie to use or the backend rejects it (expired,
// reused/revoked family, etc.) — callers should treat that as "the session is over."
//
// Only call this from a Route Handler (or something it calls into, like
// backendFetchAuthed's retry below) — next/headers' cookies().set() throws when called
// during Server Component rendering ("Understanding Cookie Behavior in Server Components"
// in Next's cookies() docs). This isn't just a thrown-error problem either: the backend
// rotates (invalidates) the *old* refresh token the moment it receives this request,
// regardless of whether the frontend can persist the new one afterward — a caller that
// can't persist would leave the browser holding an already-invalidated refresh token,
// which would trip the backend's reuse-detection and kill the whole token family on the
// next real refresh attempt. This is why the Server Component pages that read backend data
// directly during render (dashboard, dashboard layout, tenants list/detail, users list) use
// backendFetchAuthedNoRefresh below instead of the refresh-capable backendFetchAuthed.
export async function refreshAccessToken(): Promise<{
  mustChangePassword: boolean;
} | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const backendRes = await backendFetch("/auth/refresh", {
    method: "POST",
    headers: { Cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}` },
  });

  if (!backendRes.ok) return null;

  const { access_token, mustChangePassword } = (await backendRes.json()) as {
    access_token: string;
    mustChangePassword: boolean;
  };

  await setSessionCookie(access_token);
  await applyRefreshCookie(backendRes);
  return { mustChangePassword };
}

// Route-Handler-only: attaches the session's access token as a Bearer header, and on a 401
// makes one attempt to refresh via refreshAccessToken() before retrying the original request
// once with the fresh token. `isRetry` is set by the function's own recursive call only —
// never pass it from a call site — so a second consecutive 401 is propagated as-is instead
// of triggering a second refresh attempt (a genuinely dead session should fail fast, not
// loop).
export async function backendFetchAuthed(
  path: string,
  init: RequestInit = {},
  isRetry = false,
): Promise<Response> {
  const token = await getToken();
  if (!token) {
    throw new Error("backendFetchAuthed called without a session");
  }

  const res = await backendFetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (res.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return backendFetchAuthed(path, init, true);
    }
  }

  return res;
}

// For the Server Component pages that fetch backend data directly during render
// (dashboard, dashboard layout, tenants list/detail, users list) — see
// refreshAccessToken()'s doc comment above for why they can't safely use the
// refresh-capable backendFetchAuthed. Behaviorally identical to backendFetchAuthed before
// this module gained refresh support: attaches the Bearer token, propagates a 401 as-is.
// These pages are already gated by requireSession(), which redirects once the access
// token's own `exp` has passed, before any of these calls run — a 401 reaching this
// function is a genuine backend rejection (revoked, tenant deleted, etc.), not an
// expired-token case a refresh would fix.
export async function backendFetchAuthedNoRefresh(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getToken();
  if (!token) {
    throw new Error("backendFetchAuthedNoRefresh called without a session");
  }

  return backendFetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
}

// NestJS's default exception body's `message` is a plain string for most
// errors but a string array for class-validator's per-field DTO validation
// failures — this is the one place that difference gets normalized down to
// a single displayable string, so no form component has to check which
// shape it got.
export function firstErrorMessage(
  body: BackendErrorBody,
  fallback: string,
): string {
  if (Array.isArray(body.message)) return body.message[0] ?? fallback;
  return body.message || fallback;
}
