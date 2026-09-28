import { proxyToBackend } from "@/lib/proxy-route";
import { requireSuperAdmin } from "@/lib/api-guards";

export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/integration-admins/${params.id}`,
  guard: requireSuperAdmin,
  fallbackErrorMessage: "Could not delete Integration Admin",
});
