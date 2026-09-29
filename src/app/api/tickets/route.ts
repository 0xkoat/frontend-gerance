import { proxyToBackend } from "@/lib/proxy-route";
import { requireTenantMember, requireTicketUser } from "@/lib/api-guards";
import { createTicketSchema } from "@/lib/validations/tickets";

export const GET = proxyToBackend({
  method: "GET",
  path: "/tickets",
  guard: requireTicketUser,
});

export const POST = proxyToBackend({
  method: "POST",
  path: "/tickets",
  schema: createTicketSchema,
  guard: requireTenantMember,
  fallbackErrorMessage: "Could not create the ticket",
});
