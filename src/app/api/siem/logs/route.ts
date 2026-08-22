import { proxyToBackend } from "@/lib/proxy-route";

// Open to any authenticated tenant role, matching SiemController.listLogs' lack of a
// @Roles() decorator. No query filters accepted on the backend (listLogs takes no @Query()
// at all) and no pagination — returns every log for the tenant, ordered by timestamp desc.
export const GET = proxyToBackend({
  method: "GET",
  path: "/siem/logs",
  fallbackErrorMessage: "Failed to load logs",
});
