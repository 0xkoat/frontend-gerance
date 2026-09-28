import { proxyToBackend } from "@/lib/proxy-route";
import { requireSuperAdmin } from "@/lib/api-guards";
import { personFieldsSchema } from "@/lib/validations/users";

// Super Admin-only, matching IntegrationAdminsController's class-level
// @Roles(SUPER_ADMIN). Role and tenant are fixed by the backend endpoint, so the body is
// just the person fields.
export const GET = proxyToBackend({
  method: "GET",
  path: "/integration-admins",
  guard: requireSuperAdmin,
});

export const POST = proxyToBackend({
  method: "POST",
  path: "/integration-admins",
  schema: personFieldsSchema,
  guard: requireSuperAdmin,
  fallbackErrorMessage: "Could not create Integration Admin",
});
