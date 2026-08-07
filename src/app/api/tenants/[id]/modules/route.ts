import { proxyToBackend } from "@/lib/proxy-route";
import { requireSuperAdmin } from "@/lib/api-guards";
import { activateTenantModuleSchema } from "@/lib/validations/tenants";

// Added Phase 11 (2026-08-07) — the TenantModule CRUD surface described in root
// CLAUDE.md's "which modules is this tenant subscribed to" activation model, previously
// entirely unbuilt on the frontend (see CLAUDE.md's "Known gaps"). Super Admin-only,
// matching TenantsController's class-level @Roles(SUPER_ADMIN) — every route in this file
// and its [moduleName] sibling uses requireSuperAdmin, not requireAdmin.
export const GET = proxyToBackend({
  method: "GET",
  path: (params) => `/tenants/${params.id}/modules`,
  guard: requireSuperAdmin,
  fallbackErrorMessage: "Failed to load tenant modules",
});

export const POST = proxyToBackend({
  method: "POST",
  path: (params) => `/tenants/${params.id}/modules`,
  schema: activateTenantModuleSchema,
  guard: requireSuperAdmin,
  fallbackErrorMessage: "Could not activate module",
});
