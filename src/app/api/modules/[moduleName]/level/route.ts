import { proxyToBackend } from "@/lib/proxy-route";
import { requireAdmin } from "@/lib/api-guards";
import { moduleLevelSchema } from "@/lib/validations/modules";

export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/modules/${params.moduleName}/level`,
  schema: moduleLevelSchema,
  guard: requireAdmin,
  fallbackErrorMessage: "Could not change the level",
});
