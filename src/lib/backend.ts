import "server-only";
import { getToken } from "@/lib/session";

// Server-only: never fetch the backend directly from a Client Component. Route Handlers
// under src/app/api/** are the only thing allowed to call this — they act as a thin proxy
// that attaches the httpOnly-cookie-held token as an Authorization header, so the raw JWT
// never has to touch client-side JS. See CLAUDE.md "Frontend auth architecture" for why.
const BACKEND_URL = process.env.BACKEND_URL;

if (!BACKEND_URL) {
  throw new Error("BACKEND_URL environment variable is not defined");
}

// Nest's default exception filter shape. `message` is a single string for most
// exceptions, but class-validator's ValidationPipe (whitelist + forbidNonWhitelisted,
// see backend/src/main.ts) returns an array of per-field messages instead.
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

// For routes that require the caller's session token — throws if there isn't one, since
// every call site should already know it's operating on an authenticated route.
export async function backendFetchAuthed(path: string, init: RequestInit = {}) {
  const token = await getToken();
  if (!token) {
    throw new Error("backendFetchAuthed called without a session");
  }

  return backendFetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
}

export function firstErrorMessage(
  body: BackendErrorBody,
  fallback: string,
): string {
  if (Array.isArray(body.message)) return body.message[0] ?? fallback;
  return body.message || fallback;
}
