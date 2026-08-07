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
import type { SiemLog } from "@/types/siem";

// Read-only, on purpose — no PATCH/DELETE route exists for SiemLog at all, it's the raw
// pre-alert record (see the /api/siem/logs route's own comment). No row actions, no
// AssignmentControl/StatusTransitionMenu, unlike AlertsTable.
export function LogsTable({ logs }: { logs: SiemLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No logs yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Event type</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>
              <Badge
                variant="outline"
                className="gap-1.5 font-medium"
                style={{
                  borderColor: SEVERITY_COLOR[log.severity],
                  color: SEVERITY_COLOR[log.severity],
                }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLOR[log.severity] }}
                  aria-hidden
                />
                {SEVERITY_LABEL[log.severity]}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {log.source}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {log.eventType}
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
              {new Date(log.timestamp).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
