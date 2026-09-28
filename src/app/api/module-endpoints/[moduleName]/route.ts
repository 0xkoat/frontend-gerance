import { proxyToBackend } from "@/lib/proxy-route";
import { requireIntegrationAdmin } from "@/lib/api-guards";
import { moduleEndpointSchema } from "@/lib/validations/modules";

export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/module-endpoints/${params.moduleName}`,
  schema: moduleEndpointSchema,
  guard: requireIntegrationAdmin,
  fallbackErrorMessage: "Could not save the endpoint",
});
