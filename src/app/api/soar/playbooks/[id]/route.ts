import { proxyToBackend } from "@/lib/proxy-route";
import { requireAdmin } from "@/lib/api-guards";
import { updateSoarPlaybookSchema } from "@/lib/validations/soar";

// Matches SoarController.updatePlaybook/deletePlaybook's @Roles(ADMIN). Deleting a playbook
// that has existing executions 409s with a message that already points at `isActive: false`
// as the alternative — proxyToBackend's error branch surfaces that as-is.
export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/soar/playbooks/${params.id}`,
  schema: updateSoarPlaybookSchema,
  guard: requireAdmin,
  fallbackErrorMessage: "Failed to update playbook",
});

export const DELETE = proxyToBackend({
  method: "DELETE",
  path: (params) => `/soar/playbooks/${params.id}`,
  guard: requireAdmin,
  fallbackErrorMessage: "Failed to delete playbook",
});
