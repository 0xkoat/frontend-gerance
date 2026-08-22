import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { updateEdrEndpointSchema } from "@/lib/validations/edr";

// Matches EdrController.updateEndpoint/deleteEndpoint's @Roles(ADMIN, ANALYST). Deleting an
// endpoint with existing detections 409s with a message that already tells the caller to use
// DECOMMISSIONED instead — proxyToBackend's error branch surfaces that as-is, nothing extra
// needed here.
export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/edr/endpoints/${params.id}`,
  schema: updateEdrEndpointSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to update endpoint",
});

export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/edr/endpoints/${params.id}`,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to delete endpoint",
});
