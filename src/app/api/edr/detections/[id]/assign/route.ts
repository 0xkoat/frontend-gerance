import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { assignPayloadSchema } from "@/lib/validations/security";

// Matches EdrController.assignDetection/unassignDetection's @Roles(ADMIN, ANALYST). Since
// 2026-08-07, assigning an already-RESOLVED detection 409s (see CLAUDE.md's hardening note)
// — AssignmentControl already surfaces that message as-is via proxyToBackend's error branch.
export const POST = proxyToBackend({
  method: "POST",
  path: (params) => `/edr/detections/${params.id}/assign`,
  schema: assignPayloadSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to assign detection",
});

export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/edr/detections/${params.id}/assign`,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to unassign detection",
});
