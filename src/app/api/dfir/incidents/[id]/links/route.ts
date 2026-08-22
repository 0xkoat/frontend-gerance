import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { createDfirLinkSchema } from "@/lib/validations/dfir";

// Matches DfirController.createLink's @Roles(ADMIN, ANALYST). Idempotent on retry since
// 2026-08-07 (see CLAUDE.md's hardening note) — linking the same (incidentId, sourceType,
// sourceId) twice returns the existing link instead of creating a duplicate, so a
// double-submit here is safe by itself, no client-side debounce needed.
export const POST = proxyToBackend({
  method: "POST",
  path: (params) => `/dfir/incidents/${params.id}/links`,
  schema: createDfirLinkSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to link record",
});
