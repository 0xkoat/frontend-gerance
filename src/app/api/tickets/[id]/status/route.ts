import { proxyToBackend } from "@/lib/proxy-route";
import { requireTicketUser } from "@/lib/api-guards";
import { updateTicketStatusSchema } from "@/lib/validations/tickets";

export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/tickets/${params.id}/status`,
  schema: updateTicketStatusSchema,
  guard: requireTicketUser,
  fallbackErrorMessage: "Could not change the ticket status",
});
