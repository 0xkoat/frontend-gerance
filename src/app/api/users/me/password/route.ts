import { NextResponse } from "next/server";
import { backendFetchAuthed } from "@/lib/backend";
import { getToken, setSessionCookie } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validations/auth";
import { parseJsonBody, backendErrorResponse } from "@/lib/proxy-route";

export async function PATCH(request: Request) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, changePasswordSchema);
  if (parsed.error) return parsed.error;

  const backendRes = await backendFetchAuthed("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    }),
  });

  if (!backendRes.ok) {
    return backendErrorResponse(backendRes, "Could not change password");
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
