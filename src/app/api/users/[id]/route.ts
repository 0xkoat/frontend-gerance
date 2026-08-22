import { proxyToBackend } from "@/lib/proxy-route";
import { requireAdmin } from "@/lib/api-guards";
import { updateUserSchema } from "@/lib/validations/users";

// Converted from a hand-rolled implementation to proxyToBackend() to close a SonarCloud
// duplication finding — see tenants/[id]/route.ts's own comment for the full reasoning,
// this was the other of the last two holdouts.
export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/users/${params.id}`,
  schema: updateUserSchema,
  guard: requireAdmin,
  fallbackErrorMessage: "Could not update user",
});

// Backend rejects id === caller's own userId ("You cannot delete your own account") — this
// route doesn't duplicate that check, it just relays whatever the backend decides. The
// UI hides the delete action on the caller's own row anyway (see UserRowActions), but that
// is UX, not the enforcement.
export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/users/${params.id}`,
  guard: requireAdmin,
  fallbackErrorMessage: "Could not delete user",
});
