import { NextResponse } from "next/server";
import {
  backendFetchAuthed,
  firstErrorMessage,
  type BackendErrorBody,
} from "@/lib/backend";
import { requireSuperAdmin } from "@/lib/api-guards";

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
