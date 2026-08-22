import { proxyToBackend } from "@/lib/proxy-route";
import { requireAdmin } from "@/lib/api-guards";
import { changeRoleSchema } from "@/lib/validations/users";

// Converted to proxyToBackend() — see users/route.ts's own comment for the full reasoning.
// Backend also rejects self-targeting ("You cannot change your own role") and demoting a
// tenant's last remaining Admin — both relayed as-is, not duplicated here.
export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/users/${params.id}/role`,
  schema: changeRoleSchema,
  guard: requireAdmin,
  fallbackErrorMessage: "Could not change role",
});
