import { NextResponse } from "next/server";
import {
  backendFetchAuthed,
  firstErrorMessage,
  type BackendErrorBody,
} from "@/lib/backend";
import { requireAdmin } from "@/lib/api-guards";
import { resetPasswordSchema } from "@/lib/validations/users";

// Backend rejects id === caller's own userId — resetting your own password this way would
// let a stolen bearer token turn into permanent account takeover with no proof of the old
// password (see backend/CLAUDE.md). Self password changes go through
// PATCH /api/users/me/password instead, which requires the current password.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const backendRes = await backendFetchAuthed(`/users/${id}/reset-password`, {
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
          ? firstErrorMessage(errorBody, "Could not reset password")
          : "Could not reset password",
      },
      { status: backendRes.status },
    );
  }

  const body2 = await backendRes.json();
  return NextResponse.json(body2);
}
