import { proxyToBackend } from "@/lib/proxy-route";

// Open to any authenticated tenant role, matching DfirController.queryIncidents' lack of a
// @Roles() decorator. Forwards the request's own query string as-is — DfirQueryDto extends
// the shared BaseQueryDto with `status` on top, same shape as VM's/SIEM's.
export const GET = proxyToBackend({
  method: "GET",
  path: "/dfir/incidents",
  fallbackErrorMessage: "Failed to load incidents",
});
