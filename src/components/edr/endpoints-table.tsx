import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EndpointRowActions } from "@/components/edr/endpoint-row-actions";
import type { EdrEndpoint } from "@/types/edr";
import type { UserRole } from "@/types/auth";

const STATUS_VARIANT: Record<EdrEndpoint["status"], "default" | "outline"> = {
  ONLINE: "default",
  OFFLINE: "outline",
  UNKNOWN: "outline",
  DECOMMISSIONED: "outline",
};

export function EndpointsTable({
  endpoints,
  currentUserRole,
}: {
  endpoints: EdrEndpoint[];
  currentUserRole: UserRole;
}) {
  if (endpoints.length === 0) {
    return <p className="text-sm text-muted-foreground">No endpoints yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hostname</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>OS</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last seen</TableHead>
          {currentUserRole !== "VIEWER" && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {endpoints.map((endpoint) => (
          <TableRow key={endpoint.id}>
            <TableCell className="font-medium">{endpoint.hostname}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {endpoint.ip}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {endpoint.os}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[endpoint.status]}>
                {endpoint.status}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(endpoint.lastSeen).toLocaleString()}
            </TableCell>
            {currentUserRole !== "VIEWER" && (
              <TableCell>
                <EndpointRowActions endpoint={endpoint} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
