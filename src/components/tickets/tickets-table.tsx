import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TicketStatusMenu } from "@/components/tickets/ticket-status-menu";
import { allowedStatusChanges } from "@/lib/tickets";
import type { SessionClaims } from "@/types/auth";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
  TicketStatus,
  type Ticket,
} from "@/types/tickets";

const STATUS_BADGE: Record<TicketStatus, "default" | "secondary" | "outline"> =
  {
    OPEN: "default",
    IN_PROGRESS: "secondary",
    RESOLVED: "outline",
  };

export function TicketsTable({
  tickets,
  session,
  showTenant,
}: {
  tickets: Ticket[];
  session: Pick<SessionClaims, "userId" | "role" | "tenantId">;
  // Integration Admins see tickets from every tenant.
  showTenant: boolean;
}) {
  if (tickets.length === 0) {
    return <p className="px-6 text-sm text-muted-foreground">No tickets.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticket</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>From</TableHead>
          <TableHead>Opened</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id} className="align-top">
            <TableCell className="max-w-md min-w-48 whitespace-normal">
              <div className="font-medium">{ticket.title}</div>
              <p className="mt-1 line-clamp-3 text-xs whitespace-pre-line text-muted-foreground">
                {ticket.description}
              </p>
            </TableCell>
            <TableCell className="text-sm">
              {TICKET_CATEGORY_LABELS[ticket.category]}
              {ticket.moduleName && (
                <span className="text-muted-foreground">
                  {" "}
                  · {ticket.moduleName}
                </span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_BADGE[ticket.status]}>
                {TICKET_STATUS_LABELS[ticket.status]}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">
              <div>{ticket.createdByName}</div>
              <div className="text-xs text-muted-foreground">
                {showTenant ? ticket.tenant.name : ticket.createdByEmail}
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(ticket.createdAt).toLocaleString([], {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </TableCell>
            <TableCell>
              <TicketStatusMenu
                ticketId={ticket.id}
                title={ticket.title}
                allowed={allowedStatusChanges(session, ticket)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
