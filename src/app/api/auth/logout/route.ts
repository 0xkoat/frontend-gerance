import { NextResponse } from "next/server";
import {
  backendFetch,
  clearRefreshCookie,
  getRefreshToken,
} from "@/lib/backend";
import { clearSessionCookie, getToken } from "@/lib/session";

// Calls the backend's POST /auth/logout (which revokes the refresh token server-side) before
// clearing the two local cookies — a stateless "just delete our cookie" logout would leave a
// stolen access token's session alive server-side until its own 15 minute expiry, and the
// browser's refresh_token cookie usable to mint new ones indefinitely.
//
// Deliberately uses backendFetch (not the refresh-capable backendFetchAuthed) with a
// one-shot Authorization header: this call already carries the one thing a refresh would
// rotate (the refresh_token cookie, forwarded below), so routing it through
// backendFetchAuthed's lazy-refresh-on-401 path would risk sending that same refresh_token
// value twice — once implicitly via a triggered refresh, once explicitly here — against a
// backend that treats a reused refresh token as evidence of theft and revokes the whole
// token family. A single attempt is correct: logout succeeding or failing server-side
// doesn't change what happens next, the local cookies get cleared either way (best-effort).
export async function POST() {
  const token = await getToken();
  const refreshToken = await getRefreshToken();

  if (token) {
    await backendFetch("/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(refreshToken ? { Cookie: `refresh_token=${refreshToken}` } : {}),
      },
    }).catch(() => null);
  }

  await clearSessionCookie();
  await clearRefreshCookie();

  return NextResponse.json({ message: "Logged out" });
}
