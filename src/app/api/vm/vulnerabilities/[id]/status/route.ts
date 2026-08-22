import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { updateVulnerabilityStatusSchema } from "@/lib/validations/vm";

// Matches VmController.updateVulnerabilityStatus's @Roles(ADMIN, ANALYST). Accepts the full
// VmVulnerabilitiesStatus enum, not a restricted transition set — see
// updateVulnerabilityStatusSchema's own comment for why VM doesn't share EDR/SIEM/DFIR's
// StatusTransitionMenu component.
export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/vm/vulnerabilities/${params.id}/status`,
  schema: updateVulnerabilityStatusSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to update status",
});
