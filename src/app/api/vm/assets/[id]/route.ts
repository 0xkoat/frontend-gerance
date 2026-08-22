import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { updateVmAssetSchema } from "@/lib/validations/vm";

// Matches VmController.updateAsset/deleteAsset's @Roles(ADMIN, ANALYST).
export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/vm/assets/${params.id}`,
  schema: updateVmAssetSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to update asset",
});

// The backend rejects this with a foreign-key error if vulnerabilities still reference the
// asset — proxyToBackend's error branch already normalizes that into { message }, nothing
// extra to do here.
export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/vm/assets/${params.id}`,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to delete asset",
});
