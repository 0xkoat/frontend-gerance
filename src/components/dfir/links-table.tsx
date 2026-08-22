"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DfirLink } from "@/types/dfir";
import type { UserRole } from "@/types/auth";

function UnlinkButton({
  incidentId,
  linkId,
}: {
  incidentId: string;
  linkId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleUnlink() {
    setPending(true);
    try {
      const res = await fetch(
        `/api/dfir/incidents/${incidentId}/links/${linkId}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Could not unlink record");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={handleUnlink}>
      Unlink
    </Button>
  );
}

export function LinksTable({
  incidentId,
  links,
  currentUserRole,
}: {
  incidentId: string;
  links: DfirLink[];
  currentUserRole: UserRole;
}) {
  if (links.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No linked records yet.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source type</TableHead>
          <TableHead>Record ID</TableHead>
          {currentUserRole !== "VIEWER" && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {links.map((link) => (
          <TableRow key={link.id}>
            <TableCell>
              <Badge variant="outline">{link.sourceType}</Badge>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {link.sourceId}
            </TableCell>
            {currentUserRole !== "VIEWER" && (
              <TableCell>
                <UnlinkButton incidentId={incidentId} linkId={link.id} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
