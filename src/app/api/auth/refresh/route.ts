import { NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/backend";

// Thin proxy to POST /api/auth/refresh on the backend. Reads the browser's refresh_token
// cookie (Path=/api/auth, so it's already attached to this request), forwards it, and on
// success updates both the access-token session cookie and the rotated refresh_token
// cookie — see src/lib/backend.ts's refreshAccessToken() for the shared implementation
// also used by backendFetchAuthed's lazy on-401 retry.
//
// No CSRF Content-Type guard needed here, unlike login: this route takes no body and does
// nothing without a pre-existing refresh_token cookie, and SameSite=Lax keeps that cookie
// off cross-site requests — the same "already safe by construction" reasoning that applies
// to every other mutating route except login/forgot-password (see CLAUDE.md's auth
// architecture section).
export async function POST() {
  const result = await refreshAccessToken();

  if (!result) {
    return NextResponse.json(
      { message: "Session expired, please log in again" },
      { status: 401 },
    );
  }

  return NextResponse.json({ mustChangePassword: result.mustChangePassword });
}
