import { proxyToBackend } from "@/lib/proxy-route";
import { requireSuperAdmin } from "@/lib/api-guards";
import { updateTenantModuleSchema } from "@/lib/validations/tenants";

// Added Phase 11 (2026-08-07). proxyToBackend()'s path function receives both `id` and
// `moduleName` from this two-segment dynamic route with no changes to the helper needed —
// the same thing Phase 8's DFIR unlink route already proved for [id]/links/[linkId].
export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/tenants/${params.id}/modules/${params.moduleName}`,
  schema: updateTenantModuleSchema,
  guard: requireSuperAdmin,
  fallbackErrorMessage: "Could not update module",
});

export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/tenants/${params.id}/modules/${params.moduleName}`,
  guard: requireSuperAdmin,
  fallbackErrorMessage: "Could not remove module",
});
