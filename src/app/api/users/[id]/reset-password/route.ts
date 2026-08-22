import { proxyToBackend } from "@/lib/proxy-route";
import { requireAdminOrSuperAdmin } from "@/lib/api-guards";
import { resetPasswordSchema } from "@/lib/validations/users";

// Converted to proxyToBackend() — see users/route.ts's own comment for the full reasoning.
//
// Backend rejects id === caller's own userId — resetting your own password this way would
// let a stolen bearer token turn into permanent account takeover with no proof of the old
// password (see backend/CLAUDE.md). Self password changes go through
// PATCH /api/users/me/password instead, which requires the current password.
//
// Also reachable by a Super Admin now (backend/src/users/users.controller.ts), for the case
// where a tenant's sole Admin needs a reset and has no co-Admin to do it for them — the
// backend enforces the "sole Admin" restriction, this route just relays whatever it decides.
export const POST = proxyToBackend({
  method: "POST",
  path: (params) => `/users/${params.id}/reset-password`,
  schema: resetPasswordSchema,
  guard: requireAdminOrSuperAdmin,
  fallbackErrorMessage: "Could not reset password",
});
