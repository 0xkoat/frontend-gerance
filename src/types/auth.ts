// Mirrors backend/src/generated/prisma/enums.ts UserRole — hand-matched, no shared package.
// Re-verify against backend/prisma/schema.prisma if this ever looks stale.
export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  ANALYST: "ANALYST",
  VIEWER: "VIEWER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Decoded JWT payload shape — mirrors backend/src/auth/jwt.strategy.ts's JwtPayload.
// Not verified here (no signing secret on the frontend); the backend verifies the
// signature on every proxied request. This is purely for optimistic UI/redirect decisions.
export interface SessionClaims {
  userId: string;
  role: UserRole;
  tenantId: string | null;
  mustChangePassword: boolean;
}
