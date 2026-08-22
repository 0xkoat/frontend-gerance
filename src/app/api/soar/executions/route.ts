import { proxyToBackend } from "@/lib/proxy-route";

// Open to any authenticated tenant role, matching SoarController.queryExecutions' lack of a
// @Roles() decorator. Read-only for every role — no assign/status routes exist for
// SoarExecution at all, it's already terminal by the time a human sees it (see
// CLAUDE.md's Phase 7 note).
export const GET = proxyToBackend({
  method: "GET",
  path: "/soar/executions",
  fallbackErrorMessage: "Failed to load executions",
});
