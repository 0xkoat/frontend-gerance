"use client";

import { useState } from "react";
import { toast } from "sonner";
import { reloadPage } from "@/lib/reload-page";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserRole } from "@/types/auth";

function defaultLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

// Shared by every module with a status-transition route: SIEM/EDR (ESCALATED, RESOLVED) and
// DFIR (ESCALATED, CONTAINED, RESOLVED) — see src/types/{siem,edr,dfir}.ts's
// *_TRANSITIONABLE_STATUSES constants. VM has no equivalent: its
// `PATCH vulnerabilities/:id/status` accepts the full VmVulnerabilitiesStatus enum rather
// than a restricted transition set, a different enough shape that it isn't forced through
// this component (see CLAUDE.md's Phase 2 checklist).
export function StatusTransitionMenu<S extends string>({
  statusEndpoint,
  currentStatus,
  transitionableStatuses,
  statusLabels,
  currentUserRole,
}: {
  // PATCH .../status — same URL pattern across SIEM/EDR/DFIR.
  statusEndpoint: string;
  currentStatus: S;
  transitionableStatuses: readonly S[];
  // Optional nicer labels (e.g. { RESOLVED: "Resolve" }); falls back to title-casing the
  // raw enum value.
  statusLabels?: Partial<Record<S, string>>;
  currentUserRole: UserRole;
}) {
  const [pending, setPending] = useState(false);

  // Same "don't offer what the backend would reject anyway" principle as AssignmentControl.
  if (currentUserRole === UserRole.VIEWER) return null;

  const targets = transitionableStatuses.filter((s) => s !== currentStatus);
  if (targets.length === 0) return null;

  async function transitionTo(status: S) {
    setPending(true);
    try {
      const res = await fetch(statusEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Could not update status");
        return;
      }
      // window.location.reload(), not router.refresh() — see assignment-control.tsx's own
      // comment for the full account of the real bug this works around (verified live
      // against the real deployed VM, never reproduced locally).
      reloadPage();
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
          <Button variant="outline" size="sm" disabled={pending}>
            {statusLabels?.[currentStatus] ?? defaultLabel(currentStatus)}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {targets.map((status) => (
          <DropdownMenuItem key={status} onClick={() => transitionTo(status)}>
            {statusLabels?.[status] ?? defaultLabel(status)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
