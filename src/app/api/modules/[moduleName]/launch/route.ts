import { proxyToBackend } from "@/lib/proxy-route";
import { requireTenantMember } from "@/lib/api-guards";

// Returns { url } after the backend checks subscription, level and endpoint and records the
// launch; the browser then navigates there. No credentials are carried to the module yet.
export const POST = proxyToBackend({
  method: "POST",
  path: (params) => `/modules/${params.moduleName}/launch`,
  guard: requireTenantMember,
  fallbackErrorMessage: "Could not launch the module",
});
