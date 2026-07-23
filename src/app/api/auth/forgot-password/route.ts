import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { forgotPasswordSchema } from "@/lib/validations/auth";

// Same login-CSRF exposure as POST /api/auth/login (see that route's comment): this route
// also has no pre-existing-cookie precondition, so a cross-site page could otherwise reach
// it via a CORS-simple `Content-Type: text/plain` request. Lower blast radius than login
// (it only flags passwordResetRequestedAt, no session is planted), but still lets an
// attacker mass-trigger reset flags against arbitrary emails without this guard.
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      { message: "Unsupported content type" },
      { status: 415 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // Backend always responds with the same generic message regardless of whether the email exists 
  const backendRes = await backendFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(parsed.data),
  });

  const responseBody = await backendRes.json().catch(() => ({ message: "" }));
  return NextResponse.json(responseBody, { status: backendRes.status });
}
