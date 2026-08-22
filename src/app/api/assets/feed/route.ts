import { proxyToBackend } from "@/lib/proxy-route";

// Open to any authenticated tenant role, matching AssetController.getUnifiedFeed's lack of
// a @Roles() decorator (a Super Admin has no tenantId, so requireTenantId() on the backend
// 403s them the same way it already does for the dashboard's other Server-Component
// fetches — no special-casing needed here). Forwards the request's own query string as-is —
// GET /assets/feed takes only the shared BaseQueryDto (severity, assignedToUserId,
// dateFrom, dateTo, page, pageSize), no module-specific filters.
export const GET = proxyToBackend({
  method: "GET",
  path: "/assets/feed",
  fallbackErrorMessage: "Failed to load the asset feed",
});
