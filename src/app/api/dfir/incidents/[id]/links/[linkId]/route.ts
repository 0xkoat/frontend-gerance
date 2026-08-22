import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";

// Matches DfirController.deleteLink's @Roles(ADMIN, ANALYST).
export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/dfir/incidents/${params.id}/links/${params.linkId}`,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to unlink record",
});
