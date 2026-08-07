import { NextResponse } from "next/server";
import {
  backendFetchAuthed,
  firstErrorMessage,
  type BackendErrorBody,
} from "@/lib/backend";
import { requireSuperAdmin } from "@/lib/api-guards";
import { updateTenantSchema } from "@/lib/validations/tenants";

// Rename — added Phase 11 (2026-08-07). Kept in the same hand-rolled style as this file's
// existing DELETE (both predate proxyToBackend()) rather than mixing patterns within one
// file; the new modules/** subtree below uses proxyToBackend() instead, since that's genuinely
// new route surface with no existing sibling to stay consistent with.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const requestBody = await request.json().catch(() => null);
  const parsed = updateTenantSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const backendRes = await backendFetchAuthed(`/tenants/${id}`, {
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
          ? firstErrorMessage(errorBody, "Could not rename tenant")
          : "Could not rename tenant",
      },
      { status: backendRes.status },
    );
  }

  const updated = await backendRes.json();
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const backendRes = await backendFetchAuthed(`/tenants/${id}`, {
    method: "DELETE",
  });

  if (!backendRes.ok) {
    const errorBody = (await backendRes
      .json()
      .catch(() => null)) as BackendErrorBody | null;
    return NextResponse.json(
      {
        message: errorBody
          ? firstErrorMessage(errorBody, "Could not delete tenant")
          : "Could not delete tenant",
      },
      { status: backendRes.status },
    );
  }

  const body = await backendRes.json();
  return NextResponse.json(body);
}
