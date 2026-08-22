import { proxyToBackend } from "@/lib/proxy-route";
import { requireSuperAdmin } from "@/lib/api-guards";
import { createTenantSchema } from "@/lib/validations/tenants";

// Converted to proxyToBackend() — see users/route.ts's own comment for the full reasoning,
// this was one of the same batch of hand-rolled holdouts.
export const GET = proxyToBackend({
  method: "GET",
  path: "/tenants",
  guard: requireSuperAdmin,
});

export const POST = proxyToBackend({
  method: "POST",
  path: "/tenants",
  schema: createTenantSchema,
  guard: requireSuperAdmin,
  fallbackErrorMessage: "Could not create tenant",
});
