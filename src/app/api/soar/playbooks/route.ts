import { proxyToBackend } from "@/lib/proxy-route";
import { requireAdmin } from "@/lib/api-guards";
import { createSoarPlaybookSchema } from "@/lib/validations/soar";

// Open to any authenticated tenant role, matching SoarController.listPlaybooks' lack of a
// @Roles() decorator. No query params on the backend at all (like VM's assets, EDR's
// endpoints) — an unpaginated full list.
export const GET = proxyToBackend({
  method: "GET",
  path: "/soar/playbooks",
  fallbackErrorMessage: "Failed to load playbooks",
});

// Admin-only, matching SoarController.createPlaybook's @Roles(ADMIN) — unlike every other
// module's mutation routes, which are Admin-or-Analyst.
export const POST = proxyToBackend({
  method: "POST",
  path: "/soar/playbooks",
  schema: createSoarPlaybookSchema,
  guard: requireAdmin,
  fallbackErrorMessage: "Failed to create playbook",
});
