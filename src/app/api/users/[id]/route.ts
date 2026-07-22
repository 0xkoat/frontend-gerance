import { NextResponse } from "next/server";
import {
  backendFetchAuthed,
  firstErrorMessage,
  type BackendErrorBody,
} from "@/lib/backend";
import { requireAdmin } from "@/lib/api-guards";
import { updateUserSchema } from "@/lib/validations/users";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const backendRes = await backendFetchAuthed(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(parsed.data),
  });

  if (!backendRes.ok) {
    const errorBody = (await backendRes
      .json()
      .catch(() => null)) as BackendErrorBody | null;
    return NextResponse.json(
      {
        message: errorBody
          ? firstErrorMessage(errorBody, "Could not update user")
          : "Could not update user",
      },
      { status: backendRes.status },
    );
  }

  const updated = await backendRes.json();
  return NextResponse.json(updated);
}

// Backend rejects id === caller's own userId ("You cannot delete your own account") — this
// route doesn't duplicate that check, it just relays whatever the backend decides. The
// UI hides the delete action on the caller's own row anyway (see UserRowActions), but that
// is UX, not the enforcement.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const backendRes = await backendFetchAuthed(`/users/${id}`, {
    method: "DELETE",
  });

  if (!backendRes.ok) {
    const errorBody = (await backendRes
      .json()
      .catch(() => null)) as BackendErrorBody | null;
    return NextResponse.json(
      {
        message: errorBody
          ? firstErrorMessage(errorBody, "Could not delete user")
          : "Could not delete user",
      },
      { status: backendRes.status },
    );
  }

  const body = await backendRes.json();
  return NextResponse.json(body);
}
