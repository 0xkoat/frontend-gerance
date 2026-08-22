import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { assignPayloadSchema } from "@/lib/validations/security";

// Matches VmController.assignVulnerability/unassignVulnerability's @Roles(ADMIN, ANALYST).
// Unlike SIEM/EDR/DFIR's assign routes, VM's has no 409-on-resolved guard — assigning a
// vulnerability never touched a status field to begin with (see CLAUDE.md's 2026-08-07
// hardening note), so there's nothing extra for AssignmentControl to handle here.
export const POST = proxyToBackend({
  method: "POST",
  path: (params) => `/vm/vulnerabilities/${params.id}/assign`,
  schema: assignPayloadSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to assign vulnerability",
});

export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/vm/vulnerabilities/${params.id}/assign`,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to unassign vulnerability",
});
