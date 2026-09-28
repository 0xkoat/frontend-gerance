import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EndpointRowActions } from "@/components/module-endpoints/endpoint-row-actions";
import type { ModuleEndpoint } from "@/types/modules";

export function moduleUrl(endpoint: ModuleEndpoint): string | null {
  if (!endpoint.host || !endpoint.port) return null;
  const host = endpoint.host.includes(":")
    ? `[${endpoint.host}]`
    : endpoint.host;
  return `${endpoint.protocol.toLowerCase()}://${host}:${endpoint.port}${endpoint.path}`;
}

export function EndpointsTable({
  endpoints,
  canEdit,
}: {
  endpoints: ModuleEndpoint[];
  canEdit: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Module</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>Last change</TableHead>
          {canEdit && <TableHead className="w-64" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {endpoints.map((endpoint) => {
          const url = moduleUrl(endpoint);
          return (
            <TableRow key={endpoint.moduleName}>
              <TableCell className="font-medium">
                {endpoint.moduleName}
              </TableCell>
              <TableCell>
                {url ? (
                  <span className="font-mono text-sm">{url}</span>
                ) : (
                  <Badge variant="secondary">Not configured</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {url ? new Date(endpoint.updatedAt).toLocaleString() : "—"}
              </TableCell>
              {canEdit && (
                <TableCell>
                  <EndpointRowActions endpoint={endpoint} />
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
