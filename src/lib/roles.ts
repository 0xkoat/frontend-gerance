import { UserRole, type AnalystLevel } from "@/types/auth";

const ROLE_NAMES: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  INTEGRATION_ADMIN: "Integration Admin",
  ADMIN: "Admin",
  ANALYST: "Analyst",
};

// Display label for a role, with the analyst level when there is one ("Analyst · L2").
export function roleLabel(
  role: UserRole,
  analystLevel?: AnalystLevel | null,
): string {
  const name = ROLE_NAMES[role] ?? role;
  return role === UserRole.ANALYST && analystLevel
    ? `${name} · ${analystLevel}`
    : name;
}
