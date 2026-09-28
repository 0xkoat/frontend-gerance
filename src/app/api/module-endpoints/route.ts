import { proxyToBackend } from "@/lib/proxy-route";
import { requireIntegrationOrSuperAdmin } from "@/lib/api-guards";

export const GET = proxyToBackend({
  method: "GET",
  path: "/module-endpoints",
  guard: requireIntegrationOrSuperAdmin,
});
