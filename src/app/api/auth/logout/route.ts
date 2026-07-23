import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

// No backend call needed: the API is stateless JWT with no server-side session/refresh
// "Logging out" just means the
// browser stops holding a usable token — deleting our cookie is the whole operation.
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ message: "Logged out" });
}
