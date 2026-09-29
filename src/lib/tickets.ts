import { UserRole } from "@/types/auth";
import { TicketCategory, TicketStatus, type Ticket } from "@/types/tickets";
import type { SessionClaims } from "@/types/auth";

// Mirrors backend/src/tickets/tickets.service.ts's HANDLER_TRANSITIONS and
// canHandle/creator rules, so the UI only offers moves the backend will accept.
const HANDLER_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  IN_PROGRESS: [TicketStatus.OPEN, TicketStatus.RESOLVED],
  RESOLVED: [TicketStatus.OPEN],
};

export function allowedStatusChanges(
  session: Pick<SessionClaims, "userId" | "role" | "tenantId">,
  ticket: Pick<Ticket, "tenantId" | "category" | "createdById" | "status">,
): TicketStatus[] {
  const canHandle =
    (session.role === UserRole.ADMIN && session.tenantId === ticket.tenantId) ||
    (session.role === UserRole.INTEGRATION_ADMIN &&
      ticket.category === TicketCategory.MODULES);
  if (canHandle) {
    return HANDLER_TRANSITIONS[ticket.status];
  }
  if (
    ticket.createdById === session.userId &&
    ticket.status !== TicketStatus.RESOLVED
  ) {
    return [TicketStatus.RESOLVED];
  }
  return [];
}
