import { NextResponse } from "next/server";
import {
  backendFetchAuthed,
  firstErrorMessage,
  type BackendErrorBody,
} from "@/lib/backend";
import { requireAdmin } from "@/lib/api-guards";
import { createUserSchema } from "@/lib/validations/users";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const backendRes = await backendFetchAuthed("/users");
  const body = await backendRes.json().catch(() => []);
  return NextResponse.json(body, { status: backendRes.status });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const backendRes = await backendFetchAuthed("/users", {
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
          ? firstErrorMessage(errorBody, "Could not create user")
          : "Could not create user",
      },
      { status: backendRes.status },
    );
  }

  const created = await backendRes.json();
  return NextResponse.json(created, { status: 201 });
}
