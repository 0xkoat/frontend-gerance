import { NextResponse } from "next/server";
import {
  backendFetchAuthed,
  firstErrorMessage,
  type BackendErrorBody,
} from "@/lib/backend";
import { getToken } from "@/lib/session";

export async function POST() {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const backendRes = await backendFetchAuthed("/users/me/request-password-change", {
    method: "POST",
  });

  if (!backendRes.ok) {
    const errorBody = (await backendRes
      .json()
      .catch(() => null)) as BackendErrorBody | null;
    return NextResponse.json(
      {
        message: errorBody
          ? firstErrorMessage(errorBody, "Could not send the request")
          : "Could not send the request",
      },
      { status: backendRes.status },
    );
  }

  const data = (await backendRes.json()) as { message: string };
  return NextResponse.json(data);
}
