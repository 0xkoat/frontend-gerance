import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { assignPayloadSchema } from "@/lib/validations/security";

// Matches SiemController.assignAlert/unassignAlert's @Roles(ADMIN, ANALYST). Since
// 2026-08-07, assigning an already-RESOLVED alert 409s (see CLAUDE.md's hardening note) —
// AssignmentControl already surfaces that message as-is via proxyToBackend's error branch.
export const POST = proxyToBackend({
  method: "POST",
  path: (params) => `/siem/alerts/${params.id}/assign`,
  schema: assignPayloadSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to assign alert",
});

export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/siem/alerts/${params.id}/assign`,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to unassign alert",
});
