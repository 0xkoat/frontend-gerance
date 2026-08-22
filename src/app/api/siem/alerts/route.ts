import { proxyToBackend } from "@/lib/proxy-route";

// Open to any authenticated tenant role, matching SiemController.queryAlerts' lack of a
// @Roles() decorator. Forwards the request's own query string as-is — SiemQueryDto extends
// the shared BaseQueryDto with `status` on top (same shape as VM's, unlike EDR's).
export const GET = proxyToBackend({
  method: "GET",
  path: "/siem/alerts",
  fallbackErrorMessage: "Failed to load alerts",
});
