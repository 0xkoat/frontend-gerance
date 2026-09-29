import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/auth";
import {
  TICKET_STATUS_LABELS,
  TicketStatus,
  type Ticket,
} from "@/types/tickets";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";

const DESCRIPTIONS: Partial<Record<UserRole, string>> = {
  ADMIN:
    "Every ticket raised in your tenant. Raise one yourself for anything the platform team should handle.",
  ANALYST:
    "Tickets you raised. Your Admins are notified, and for Modules tickets the Integration Admin too.",
  INTEGRATION_ADMIN: "Modules tickets from every tenant.",
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession();
  if (
    session.role !== UserRole.ADMIN &&
    session.role !== UserRole.ANALYST &&
    session.role !== UserRole.INTEGRATION_ADMIN
  ) {
    redirect("/dashboard");
  }

  const { status } = await searchParams;
  const activeStatus = Object.values(TicketStatus).includes(
    status as TicketStatus,
  )
    ? (status as TicketStatus)
    : undefined;

  const res = await backendFetchAuthedNoRefresh(
    activeStatus ? `/tickets?status=${activeStatus}` : "/tickets",
  );
  const tickets: Ticket[] = res.ok ? await res.json() : [];
  const canCreate = session.role !== UserRole.INTEGRATION_ADMIN;

  const filters: { label: string; value?: TicketStatus }[] = [
    { label: "All" },
    ...Object.values(TicketStatus).map((s) => ({
      label: TICKET_STATUS_LABELS[s],
      value: s,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tickets</h1>
        <p className="text-sm text-muted-foreground">
          {DESCRIPTIONS[session.role]}
        </p>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          canCreate && "min-[1700px]:grid-cols-[minmax(0,1fr)_20rem]",
        )}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
            </CardTitle>
            <nav className="flex gap-1" aria-label="Filter by status">
              {filters.map((f) => (
                <Link
                  key={f.label}
                  href={f.value ? `/tickets?status=${f.value}` : "/tickets"}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs",
                    activeStatus === f.value
                      ? "bg-sidebar-accent font-medium"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          </CardHeader>
          <CardContent className="px-0">
            <TicketsTable
              tickets={tickets}
              session={session}
              showTenant={session.role === UserRole.INTEGRATION_ADMIN}
            />
          </CardContent>
        </Card>

        {canCreate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                New ticket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CreateTicketForm />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
