"use client";

import { useState } from "react";
import { toast } from "sonner";
import { reloadPage } from "@/lib/reload-page";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/types/auth";

export interface AssignableUser {
  id: string;
  name: string;
  role: UserRole;
}

// Shared by every module's list page (except VM — see src/types/vm.ts's comment, its
// vulnerabilities do have an assign route, matching the others; only VM's assignment status
// doesn't gate a status-transition the way SIEM/EDR/DFIR's does). One instance per
// assignable row.
//
// `assignableUsers` (that tenant's Analysts and Admins) is fetched once by the list page via
// GET /users, filtered client-side to ADMIN/ANALYST, and passed down — not re-fetched per
// row, which would mean one GET /users call per row on a page with many rows.
export function AssignmentControl({
  assignEndpoint,
  assignedToUserId,
  currentUserId,
  currentUserRole,
  assignableUsers,
}: {
  // Same URL for both operations: POST assigns (body: { assignedToUserId }), DELETE
  // unassigns (no body) — matches every module's paired POST/DELETE .../assign routes.
  assignEndpoint: string;
  assignedToUserId: string | null;
  currentUserId: string;
  currentUserRole: UserRole;
  assignableUsers: AssignableUser[];
}) {
  const [pending, setPending] = useState(false);

  // Viewer is read-only by design (backend/CLAUDE.md's module plan, decision 9) — the
  // backend already rejects an Analyst/Admin-gated assign call from a Viewer regardless, but
  // the control shouldn't offer the option in the first place, same principle
  // UserRowActions already applies to self-targeting.
  if (currentUserRole === UserRole.VIEWER) return null;

  async function submit(body: { assignedToUserId: string } | null) {
    setPending(true);
    try {
      const res = await fetch(assignEndpoint, {
        method: body ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // The backend's 409 (already resolved/contained — see CLAUDE.md's 2026-08-07
        // hardening note) arrives here as a normal { message } body via proxyToBackend's
        // firstErrorMessage() normalization, same as any other error status — no special
        // casing needed, just show what the backend said instead of a generic toast.
        toast.error(data.message ?? "Could not update assignment");
        return;
      }
      // window.location.reload(), not router.refresh() — hit for real, 2026-08-22, against
      // the real deployed VM: router.refresh()'s soft RSC refetch genuinely gets a fresh,
      // uncached 200 response from the server (verified directly via network capture — the
      // backend mutation itself is correct, confirmed both by the assign response body and
      // an independent re-fetch), but the client never applied it to this row; a hard
      // reload of the same page immediately showed the correct data. Never reproduced
      // against local dev (`next dev`), only against the real production build — root cause
      // not fully chased down (Next's client Router Cache internals), but a full reload is
      // verified to reliably show correct data every time, which matters more than a smooth
      // partial refresh for a row that just changed ownership/status.
      reloadPage();
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (assignedToUserId) {
    const assignee = assignableUsers.find((u) => u.id === assignedToUserId);
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {assignee?.name ?? "Assigned"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => submit(null)}
        >
          Unassign
        </Button>
      </div>
    );
  }

  if (currentUserRole === UserRole.ANALYST) {
    // Matches resolveAssignee's server-side rule exactly: an Analyst can only assign to
    // themselves, so there's no picker to offer in the first place.
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => submit({ assignedToUserId: currentUserId })}
      >
        Assign to me
      </Button>
    );
  }

  // Admin: a plain Select, not a searchable/filterable one — no combobox primitive exists in
  // this shadcn preset (base-ui, no cmdk-equivalent installed). Revisit if a tenant's member
  // list grows large enough that scrolling a plain dropdown becomes painful.
  return (
    <Select<string>
      disabled={pending}
      onValueChange={(value) => value && submit({ assignedToUserId: value })}
    >
      <SelectTrigger size="sm" className="w-40">
        <SelectValue placeholder="Assign to..." />
      </SelectTrigger>
      <SelectContent>
        {assignableUsers.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
