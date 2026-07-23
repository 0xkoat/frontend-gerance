import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { UserRole } from "@/types/auth";

// Shared by every Route Handler under src/app/api/**. Fast-fail for a nicer error message
// only — NOT the security boundary. The backend's own @Roles()/@Roles(UserRole.SUPER_ADMIN)
// guards reject the wrong role regardless of what these checks do; never remove a backend
// guard on the assumption one of these covers it.
export async function requireRole(...roles: UserRole[]) {
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
  if (!roles.includes(session.role)) {
    return {
      error: NextResponse.json(
        { message: `${roles.join(" or ")} access required` },
        { status: 403 },
      ),
      session: null,
    };
  }
  return { error: null, session };
}

export const requireAdmin = () => requireRole(UserRole.ADMIN);
export const requireSuperAdmin = () => requireRole(UserRole.SUPER_ADMIN);
// The backend's POST /users/:id/reset-password now accepts both roles too (see
// backend/src/users/users.controller.ts) — a Super Admin resetting an Admin's password is
// only valid when that Admin has no co-Admin in their tenant to do it instead
// (UsersService.resetSoleAdminPassword enforces that; this guard is just the fast-fail).
export const requireAdminOrSuperAdmin = () =>
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);
