import { NextResponse } from "next/server";
import {
  backendFetchAuthed,
  firstErrorMessage,
  type BackendErrorBody,
} from "@/lib/backend";
import { requireAdmin } from "@/lib/api-guards";
import { changeRoleSchema } from "@/lib/validations/users";

// Backend also rejects self-targeting ("You cannot change your own role") and demoting a
// tenant's last remaining Admin — both relayed as-is, not duplicated here.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = changeRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const backendRes = await backendFetchAuthed(`/users/${id}/role`, {
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
          ? firstErrorMessage(errorBody, "Could not change role")
          : "Could not change role",
      },
      { status: backendRes.status },
    );
  }

  const updated = await backendRes.json();
  return NextResponse.json(updated);
}
