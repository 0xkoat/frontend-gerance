import { NextResponse } from "next/server";
import {
  backendFetchAuthed,
  firstErrorMessage,
  type BackendErrorBody,
} from "@/lib/backend";
import { getToken, setSessionCookie } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validations/auth";

export async function PATCH(request: Request) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const backendRes = await backendFetchAuthed("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    }),
  });

  if (!backendRes.ok) {
    const errorBody = (await backendRes
      .json()
      .catch(() => null)) as BackendErrorBody | null;
    return NextResponse.json(
      {
        message: errorBody
          ? firstErrorMessage(errorBody, "Could not change password")
          : "Could not change password",
      },
      { status: backendRes.status },
    );
  }

  // mustChangePassword flips server-side, so the backend mints a fresh token reflecting
  // that — our cookie has to be replaced with it, not just left as-is.
  const { message, access_token } = (await backendRes.json()) as {
    message: string;
    access_token: string;
  };

  await setSessionCookie(access_token);

  return NextResponse.json({ message });
}
