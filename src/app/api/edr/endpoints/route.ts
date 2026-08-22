import { proxyToBackend } from "@/lib/proxy-route";

// Open to any authenticated tenant role, matching EdrController.listEndpoints' lack of a
// @Roles() decorator. No POST here — no manual create route exists on the backend, endpoints
// only ever appear via ingest()'s upsert (see CLAUDE.md's Phase 4 note).
export const GET = proxyToBackend({
  method: "GET",
  path: "/edr/endpoints",
  fallbackErrorMessage: "Failed to load endpoints",
});
