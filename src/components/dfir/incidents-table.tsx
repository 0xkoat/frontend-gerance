import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/severity";
import { StatusTransitionMenu } from "@/components/security/status-transition-menu";
import {
  AssignmentControl,
  type AssignableUser,
} from "@/components/security/assignment-control";
import type { UserRole } from "@/types/auth";
import {
  DFIR_INCIDENT_TRANSITIONABLE_STATUSES,
  type DfirIncident,
} from "@/types/dfir";

export function IncidentsTable({
  incidents,
  currentUserId,
  currentUserRole,
  assignableUsers,
}: {
  incidents: DfirIncident[];
  currentUserId: string;
  currentUserRole: UserRole;
  assignableUsers: AssignableUser[];
}) {
  if (incidents.length === 0) {
    return <p className="text-sm text-muted-foreground">No incidents found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>MITRE</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assignee</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incidents.map((incident) => (
          <TableRow key={incident.id}>
            <TableCell>
              <Badge
                variant="outline"
                className="gap-1.5 font-medium"
                style={{
                  borderColor: SEVERITY_COLOR[incident.severity],
                  color: SEVERITY_COLOR[incident.severity],
                }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLOR[incident.severity] }}
                  aria-hidden
                />
                {SEVERITY_LABEL[incident.severity]}
              </Badge>
            </TableCell>
            <TableCell>
              <Link
                href={`/dfir/${incident.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {incident.title}
              </Link>
              {incident.description && (
                <p className="max-w-xs truncate text-xs text-muted-foreground">
                  {incident.description}
                </p>
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {incident.mitreTechniques.length > 0
                ? incident.mitreTechniques.join(", ")
                : "—"}
            </TableCell>
            <TableCell>
              <StatusTransitionMenu
                statusEndpoint={`/api/dfir/incidents/${incident.id}/status`}
                currentStatus={incident.status}
                transitionableStatuses={DFIR_INCIDENT_TRANSITIONABLE_STATUSES}
                currentUserRole={currentUserRole}
              />
            </TableCell>
            <TableCell>
              <AssignmentControl
                assignEndpoint={`/api/dfir/incidents/${incident.id}/assign`}
                assignedToUserId={incident.assignedToUserId}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                assignableUsers={assignableUsers}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
