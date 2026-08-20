import { NextResponse } from "next/server";
import {
  backendFetchAuthed,
  firstErrorMessage,
  type BackendErrorBody,
} from "@/lib/backend";
import { requireSuperAdmin } from "@/lib/api-guards";
import { createTenantSchema } from "@/lib/validations/tenants";

// Hand-rolled, not proxyToBackend() (proxy-route.ts) — this predates that
// shared factory (added in Phase 2 for the six security modules) and was
// never migrated onto it, same as the rest of api/users/**. GET is
// Super-Admin-only, same RBAC as every other route in this file.
export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const backendRes = await backendFetchAuthed("/tenants");
  const body = await backendRes.json().catch(() => []);
  return NextResponse.json(body, { status: backendRes.status });
}

export async function POST(request: Request) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const backendRes = await backendFetchAuthed("/tenants", {
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
          ? firstErrorMessage(errorBody, "Could not create tenant")
          : "Could not create tenant",
      },
      { status: backendRes.status },
    );
  }

  const created = await backendRes.json();
  return NextResponse.json(created, { status: 201 });
}
