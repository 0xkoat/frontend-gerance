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
import { VulnerabilityStatusMenu } from "@/components/vm/vulnerability-status-menu";
import {
  AssignmentControl,
  type AssignableUser,
} from "@/components/security/assignment-control";
import type { UserRole } from "@/types/auth";
import type { VmAsset, VmVulnerability } from "@/types/vm";

export function VulnerabilitiesTable({
  vulnerabilities,
  assetsById,
  currentUserId,
  currentUserRole,
  assignableUsers,
}: {
  vulnerabilities: VmVulnerability[];
  assetsById: Record<string, VmAsset>;
  currentUserId: string;
  currentUserRole: UserRole;
  assignableUsers: AssignableUser[];
}) {
  if (vulnerabilities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No vulnerabilities found.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>CVE</TableHead>
          <TableHead>Asset</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assignee</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vulnerabilities.map((vuln) => {
          const asset = assetsById[vuln.assetId];
          return (
            <TableRow key={vuln.id}>
              <TableCell>
                <Badge
                  variant="outline"
                  className="gap-1.5 font-medium"
                  style={{
                    borderColor: SEVERITY_COLOR[vuln.severity],
                    color: SEVERITY_COLOR[vuln.severity],
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLOR[vuln.severity] }}
                    aria-hidden
                  />
                  {SEVERITY_LABEL[vuln.severity]}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate text-sm">
                {vuln.description}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {vuln.cveId ?? "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {asset ? `${asset.name} (${asset.ip})` : vuln.assetId}
              </TableCell>
              <TableCell>
                <VulnerabilityStatusMenu
                  vulnerabilityId={vuln.id}
                  currentStatus={vuln.status}
                  currentUserRole={currentUserRole}
                />
              </TableCell>
              <TableCell>
                <AssignmentControl
                  assignEndpoint={`/api/vm/vulnerabilities/${vuln.id}/assign`}
                  assignedToUserId={vuln.assignedToUserId}
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
