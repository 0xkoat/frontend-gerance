import { proxyToBackend } from "@/lib/proxy-route";

// DFIR's one real detail endpoint (see decision 8 in CLAUDE.md's adaptation plan) — returns
// the incident plus its full DfirLink[]. Open to any authenticated tenant role, matching
// DfirController.getIncidentDetail's lack of a @Roles() decorator.
export const GET = proxyToBackend({
  method: "GET",
  path: (params) => `/dfir/incidents/${params.id}`,
  fallbackErrorMessage: "Failed to load incident",
});
