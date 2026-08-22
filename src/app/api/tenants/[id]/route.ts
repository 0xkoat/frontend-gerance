import { proxyToBackend } from "@/lib/proxy-route";
import { requireSuperAdmin } from "@/lib/api-guards";
import { updateTenantSchema } from "@/lib/validations/tenants";

// Rename — added Phase 11 (2026-08-07). Converted from a hand-rolled implementation to
// proxyToBackend() to close a SonarCloud duplication finding: this and users/[id]'s
// PATCH/DELETE were the last two Route Handlers in the app still repeating the
// validate → guard → backendFetchAuthed → normalize-error shape by hand instead of through
// the shared factory every other module route (including this file's own modules/**
// siblings) already uses.
export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/tenants/${params.id}`,
  schema: updateTenantSchema,
  guard: requireSuperAdmin,
  fallbackErrorMessage: "Could not rename tenant",
});

export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/tenants/${params.id}`,
  guard: requireSuperAdmin,
  fallbackErrorMessage: "Could not delete tenant",
});
