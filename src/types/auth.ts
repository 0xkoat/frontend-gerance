// Mirrors backend/src/generated/prisma/enums.ts UserRole — hand-matched, no shared package.
// Re-verify against backend/prisma/schema.prisma if this ever looks stale.
export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  INTEGRATION_ADMIN: "INTEGRATION_ADMIN",
  ADMIN: "ADMIN",
  ANALYST: "ANALYST",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Mirrors the backend's AnalystLevel enum. Set exactly when role is ANALYST (a DB CHECK
// constraint enforces it), null for every other role.
export const AnalystLevel = {
  L1: "L1",
  L2: "L2",
  L3: "L3",
} as const;

export type AnalystLevel = (typeof AnalystLevel)[keyof typeof AnalystLevel];

// Decoded JWT payload shape — mirrors backend/src/auth/jwt.strategy.ts's JwtPayload.
// Not verified here (no signing secret on the frontend); the backend verifies the
// signature on every proxied request. This is purely for optimistic UI/redirect decisions.
export interface SessionClaims {
  userId: string;
  role: UserRole;
  analystLevel: AnalystLevel | null;
  tenantId: string | null;
  mustChangePassword: boolean;
}
