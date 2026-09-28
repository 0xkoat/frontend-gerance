import { proxyToBackend } from "@/lib/proxy-route";
import { requireIntegrationAdmin } from "@/lib/api-guards";

// Asks the backend to open a TCP connection to the saved host:port. The probe runs from
// the backend's network, which is what matters: that's where launches are configured for.
export const POST = proxyToBackend({
  method: "POST",
  path: (params) => `/module-endpoints/${params.moduleName}/test`,
  guard: requireIntegrationAdmin,
  fallbackErrorMessage: "Connection test failed",
});
