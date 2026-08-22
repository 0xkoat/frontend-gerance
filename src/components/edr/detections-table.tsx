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
  EDR_DETECTION_TRANSITIONABLE_STATUSES,
  type EdrDetection,
  type EdrEndpoint,
} from "@/types/edr";

export function DetectionsTable({
  detections,
  endpointsById,
  currentUserId,
  currentUserRole,
  assignableUsers,
}: {
  detections: EdrDetection[];
  endpointsById: Record<string, EdrEndpoint>;
  currentUserId: string;
  currentUserRole: UserRole;
  assignableUsers: AssignableUser[];
}) {
  if (detections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No detections found.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>Detection</TableHead>
          <TableHead>MITRE</TableHead>
          <TableHead>Endpoint</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assignee</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detections.map((detection) => {
          const endpoint = endpointsById[detection.endpointId];
          return (
            <TableRow key={detection.id}>
              <TableCell>
                <Badge
                  variant="outline"
                  className="gap-1.5 font-medium"
                  style={{
                    borderColor: SEVERITY_COLOR[detection.severity],
                    color: SEVERITY_COLOR[detection.severity],
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{
                      backgroundColor: SEVERITY_COLOR[detection.severity],
                    }}
                    aria-hidden
                  />
                  {SEVERITY_LABEL[detection.severity]}
                </Badge>
              </TableCell>
              <TableCell>
                <p className="font-medium">{detection.detectionName}</p>
                {detection.description && (
                  <p className="max-w-xs truncate text-xs text-muted-foreground">
                    {detection.description}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {detection.mitreTechniques.length > 0
                  ? detection.mitreTechniques.join(", ")
                  : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {endpoint ? endpoint.hostname : detection.endpointId}
              </TableCell>
              <TableCell>
                <StatusTransitionMenu
                  statusEndpoint={`/api/edr/detections/${detection.id}/status`}
                  currentStatus={detection.status}
                  transitionableStatuses={EDR_DETECTION_TRANSITIONABLE_STATUSES}
                  currentUserRole={currentUserRole}
                />
              </TableCell>
              <TableCell>
                <AssignmentControl
                  assignEndpoint={`/api/edr/detections/${detection.id}/assign`}
                  assignedToUserId={detection.assignedToUserId}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  assignableUsers={assignableUsers}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
