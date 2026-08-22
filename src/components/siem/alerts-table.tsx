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
  SIEM_ALERT_TRANSITIONABLE_STATUSES,
  type SiemAlert,
} from "@/types/siem";

export function AlertsTable({
  alerts,
  currentUserId,
  currentUserRole,
  assignableUsers,
}: {
  alerts: SiemAlert[];
  currentUserId: string;
  currentUserRole: UserRole;
  assignableUsers: AssignableUser[];
}) {
  if (alerts.length === 0) {
    return <p className="text-sm text-muted-foreground">No alerts found.</p>;
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
        {alerts.map((alert) => (
          <TableRow key={alert.id}>
            <TableCell>
              <Badge
                variant="outline"
                className="gap-1.5 font-medium"
                style={{
                  borderColor: SEVERITY_COLOR[alert.severity],
                  color: SEVERITY_COLOR[alert.severity],
                }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLOR[alert.severity] }}
                  aria-hidden
                />
                {SEVERITY_LABEL[alert.severity]}
              </Badge>
            </TableCell>
            <TableCell>
              <p className="font-medium">{alert.title}</p>
              {alert.description && (
                <p className="max-w-xs truncate text-xs text-muted-foreground">
                  {alert.description}
                </p>
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {alert.mitreTechniques.length > 0
                ? alert.mitreTechniques.join(", ")
                : "—"}
            </TableCell>
            <TableCell>
              <StatusTransitionMenu
                statusEndpoint={`/api/siem/alerts/${alert.id}/status`}
                currentStatus={alert.status}
                transitionableStatuses={SIEM_ALERT_TRANSITIONABLE_STATUSES}
                currentUserRole={currentUserRole}
              />
            </TableCell>
            <TableCell>
              <AssignmentControl
                assignEndpoint={`/api/siem/alerts/${alert.id}/assign`}
                assignedToUserId={alert.assignedToUserId}
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
