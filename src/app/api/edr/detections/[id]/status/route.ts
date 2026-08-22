import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { updateEdrDetectionStatusSchema } from "@/lib/validations/edr";

// Matches EdrController.updateDetectionStatus's @Roles(ADMIN, ANALYST).
export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/edr/detections/${params.id}/status`,
  schema: updateEdrDetectionStatusSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to update status",
});
