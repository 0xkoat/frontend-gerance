import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { createCtiIocSchema } from "@/lib/validations/cti";

// Open to any authenticated tenant role, matching CtiController.queryIocs' lack of a
// @Roles() decorator. Forwards the request's own query string as-is — CtiQueryDto extends
// the shared BaseQueryDto with `type` on top; `severity`/`assignedToUserId` are inherited
// but silently unused by CtiService.query() (CtiIoc has neither field), so the page never
// sends them.
export const GET = proxyToBackend({
  method: "GET",
  path: "/cti/iocs",
  fallbackErrorMessage: "Failed to load IOCs",
});

// Matches CtiController.createIoc's @Roles(ADMIN, ANALYST).
export const POST = proxyToBackend({
  method: "POST",
  path: "/cti/iocs",
  schema: createCtiIocSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to create IOC",
});
