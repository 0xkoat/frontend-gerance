import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { assignPayloadSchema } from "@/lib/validations/security";

// Matches DfirController.assignIncident/unassignIncident's @Roles(ADMIN, ANALYST). Since
// 2026-08-07, assigning an already-CONTAINED/RESOLVED incident 409s (see CLAUDE.md's
// hardening note) — AssignmentControl already surfaces that message as-is.
export const POST = proxyToBackend({
  method: "POST",
  path: (params) => `/dfir/incidents/${params.id}/assign`,
  schema: assignPayloadSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to assign incident",
});

export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/dfir/incidents/${params.id}/assign`,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to unassign incident",
});
