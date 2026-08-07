import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlaybookRowActions } from "@/components/soar/playbook-row-actions";
import type { SoarPlaybook } from "@/types/soar";
import type { UserRole } from "@/types/auth";

export function PlaybooksTable({
  playbooks,
  currentUserRole,
}: {
  playbooks: SoarPlaybook[];
  currentUserRole: UserRole;
}) {
  if (playbooks.length === 0) {
    return <p className="text-sm text-muted-foreground">No playbooks yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Triggers on</TableHead>
          <TableHead>Status</TableHead>
          {/* Admin-only actions column — Analyst/Viewer get a fully read-only table,
              matching SoarController's @Roles(ADMIN) on every mutation route. */}
          {currentUserRole === "ADMIN" && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {playbooks.map((playbook) => (
          <TableRow key={playbook.id}>
            <TableCell className="font-medium">{playbook.name}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {playbook.triggerCondition.severity}
            </TableCell>
            <TableCell>
              <Badge variant={playbook.isActive ? "default" : "outline"}>
                {playbook.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            {currentUserRole === "ADMIN" && (
              <TableCell>
                <PlaybookRowActions playbook={playbook} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
