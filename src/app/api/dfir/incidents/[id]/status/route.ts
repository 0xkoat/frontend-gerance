import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { updateDfirIncidentStatusSchema } from "@/lib/validations/dfir";

// Matches DfirController.updateStatus's @Roles(ADMIN, ANALYST).
export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/dfir/incidents/${params.id}/status`,
  schema: updateDfirIncidentStatusSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to update status",
});
