import { proxyToBackend } from "@/lib/proxy-route";

// Open to any authenticated tenant role, matching VmController.queryVulnerabilities' lack of
// a @Roles() decorator. Forwards the request's own query string as-is (severity, status,
// assetId, assignedToUserId, dateFrom, dateTo, page, pageSize — VmQueryDto extends the
// shared BaseQueryDto with status/assetId on top).
export const GET = proxyToBackend({
  method: "GET",
  path: "/vm/vulnerabilities",
  fallbackErrorMessage: "Failed to load vulnerabilities",
});
