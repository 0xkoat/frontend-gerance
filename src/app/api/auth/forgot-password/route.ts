import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // Backend always responds with the same generic message regardless of whether the email
  // exists (see backend/CLAUDE.md — deliberate anti-enumeration measure). We just relay it.
  const backendRes = await backendFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(parsed.data),
  });

  const responseBody = await backendRes.json().catch(() => ({ message: "" }));
  return NextResponse.json(responseBody, { status: backendRes.status });
}
