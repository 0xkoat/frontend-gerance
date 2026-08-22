import { proxyToBackend } from "@/lib/proxy-route";

// Open to any authenticated tenant role, matching EdrController.queryDetections' lack of a
// @Roles() decorator. Forwards the request's own query string as-is — EdrQueryDto extends
// the shared BaseQueryDto with only `endpointId` on top (no `status` filter, unlike VM's
// query — the EDR page's filter set is scoped accordingly, see its own comment).
export const GET = proxyToBackend({
  method: "GET",
  path: "/edr/detections",
  fallbackErrorMessage: "Failed to load detections",
});
