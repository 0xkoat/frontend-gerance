import { NextResponse } from "next/server";
import {
  backendFetch,
  firstErrorMessage,
  type BackendErrorBody,
} from "@/lib/backend";
import { setSessionCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validations/auth";

// Thin proxy to POST /api/auth/login on the backend. The only reason this exists instead
// of the browser calling the backend directly: it's the one place allowed to read the raw
// access_token and put it in an httpOnly cookie, so client-side JS never sees it.
//
// This is also the one Route Handler in the app that a cross-site request can reach with
// no cookie precondition (every other mutating route requires the session cookie to
// already exist, and SameSite=Lax keeps that cookie off cross-site requests entirely — see
// src/lib/session.ts). Without the Content-Type check below, a cross-site page could POST
// here with `mode: "no-cors"` + `Content-Type: text/plain` (a CORS-simple type, so no
// preflight) carrying a JSON string body; `Request.json()` parses the body regardless of
// the declared Content-Type, so the handler would still process attacker-supplied
// credentials and plant the resulting session cookie in the victim's browser (login CSRF).
// Requiring a real `application/json` Content-Type forces the browser to send a CORS
// preflight first, which this route never answers with an Access-Control-Allow-Origin
// header — closing the bypass.
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      { message: "Unsupported content type" },
      { status: 415 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const backendRes = await backendFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(parsed.data),
  });

  if (!backendRes.ok) {
    const errorBody = (await backendRes
      .json()
      .catch(() => null)) as BackendErrorBody | null;
    return NextResponse.json(
      {
        message: errorBody
          ? firstErrorMessage(errorBody, "Login failed")
          : "Login failed",
      },
      { status: backendRes.status },
    );
  }

  const { access_token, mustChangePassword } = (await backendRes.json()) as {
    access_token: string;
    mustChangePassword: boolean;
  };

  await setSessionCookie(access_token);

  return NextResponse.json({ mustChangePassword });
}
