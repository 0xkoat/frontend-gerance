import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { updateCtiIocSchema } from "@/lib/validations/cti";

// Matches CtiController.updateIoc/deleteIoc's @Roles(ADMIN, ANALYST). PATCH only accepts
// confidence/source — type/value are the IOC's identity, not editable (see
// updateCtiIocSchema's own comment).
export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/cti/iocs/${params.id}`,
  schema: updateCtiIocSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to update IOC",
});

export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/cti/iocs/${params.id}`,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to delete IOC",
});
