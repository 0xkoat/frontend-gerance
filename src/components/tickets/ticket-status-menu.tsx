"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TICKET_STATUS_LABELS, TicketStatus } from "@/types/tickets";

const ACTION_LABELS: Record<TicketStatus, string> = {
  OPEN: "Reopen",
  IN_PROGRESS: "Start working on it",
  RESOLVED: "Mark resolved",
};

// Only offers the moves the backend will accept for this user (see lib/tickets.ts's
// allowedStatusChanges, which the page computes and passes in).
export function TicketStatusMenu({
  ticketId,
  title,
  allowed,
}: {
  ticketId: string;
  title: string;
  allowed: TicketStatus[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (allowed.length === 0) {
    return null;
  }

  async function change(status: TicketStatus) {
    setPending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Could not change the ticket status");
        return;
      }
      toast.success(`Ticket is now ${TICKET_STATUS_LABELS[status]}`);
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            aria-label={`Change status of ${title}`}
          >
            {pending ? "Saving..." : "Update"}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {allowed.map((status) => (
          <DropdownMenuItem key={status} onClick={() => change(status)}>
            {ACTION_LABELS[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
