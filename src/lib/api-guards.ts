import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { UserRole } from "@/types/auth";

// Shared by every Route Handler under src/app/api/**. Fast-fail for a nicer error message
// only — NOT the security boundary. The backend's own @Roles()/@Roles(UserRole.SUPER_ADMIN)
// guards reject the wrong role regardless of what these checks do; never remove a backend
// guard on the assumption one of these covers it.
export async function requireRole(role: UserRole) {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 },
      ),
      session: null,
    };
  }
  if (session.role !== role) {
    return {
      error: NextResponse.json(
        { message: `${role} access required` },
        { status: 403 },
      ),
      session: null,
    };
  }
  return { error: null, session };
}

export const requireAdmin = () => requireRole(UserRole.ADMIN);
export const requireSuperAdmin = () => requireRole(UserRole.SUPER_ADMIN);
