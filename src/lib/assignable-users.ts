import { UserRole, type SessionClaims } from "@/types/auth";
import type { TenantUser } from "@/components/users/users-table";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";

// Shared by every module list page (VM, EDR, SIEM, DFIR's assignment picker; assets' "who is
// this assigned to" name lookup) — was byte-identical inline code in all of them until this
// extraction. GET /users is Admin-only on the backend, so only an Admin session can resolve
// assignedToUserId to a human name at all — an Analyst still gets their own "Assign to me"
// button (needs no list), a Viewer sees neither. Capped at 100 (the backend's own pageSize
// max) rather than paginating through every tenant user here, same tradeoff noted since
// Phase 2. Filtering to ADMIN/ANALYST is safe for every caller, not just the assignment
// pickers: the backend's own `resolveAssignee` rule means an assignee is always one of those
// two roles (an Analyst can only self-assign, an Admin can only assign to an Admin/Analyst),
// so a Viewer is never a valid assignedToUserId to look up either.
export async function resolveAssignableTenantUsers(
  session: Pick<SessionClaims, "role">,
): Promise<TenantUser[]> {
  if (session.role !== UserRole.ADMIN) return [];

  const usersRes = await backendFetchAuthedNoRefresh("/users?pageSize=100");
  if (!usersRes.ok) return [];

  const data = (await usersRes.json()) as { users: TenantUser[] };
  return data.users.filter((u) => u.role === "ADMIN" || u.role === "ANALYST");
}
