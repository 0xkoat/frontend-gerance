import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { updateSiemAlertStatusSchema } from "@/lib/validations/siem";

// Matches SiemController.updateAlertStatus's @Roles(ADMIN, ANALYST).
export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/siem/alerts/${params.id}/status`,
  schema: updateSiemAlertStatusSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to update status",
});
