import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { MockAlert } from "@/lib/mock-data";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/severity";

// Status color carries severity on the badge — but never alone: the label text says
// "Critical"/"High"/etc, so a color-blind reader isn't relying on the swatch.
function SeverityBadge({ severity }: { severity: MockAlert["severity"] }) {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 font-medium"
      style={{
        borderColor: SEVERITY_COLOR[severity],
        color: SEVERITY_COLOR[severity],
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: SEVERITY_COLOR[severity] }}
        aria-hidden
      />
      {SEVERITY_LABEL[severity]}
    </Badge>
  );
}

const STATUS_LABEL: Record<MockAlert["status"], string> = {
  open: "Open",
  assigned: "Assigned",
  escalated: "Escalated",
  resolved: "Resolved",
};

// No readOnly/actions prop yet on purpose: there's nothing to gate. Row actions
// (assign/escalate/resolve) only make sense once there's a real SIEM module behind this —
// faking a disabled button here would just be UI theater. When that lands, Viewer's "read
// only" role restriction (see root CLAUDE.md's role model) becomes "don't render the action
// buttons for this role," added to this component then, not now.
export function AlertsTable({ alerts }: { alerts: MockAlert[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>ID</TableHead>
          <TableHead>Title / MITRE</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Module</TableHead>
          <TableHead>Analyst</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((alert) => (
          <TableRow key={alert.id}>
            <TableCell>
              <SeverityBadge severity={alert.severity} />
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {alert.id}
            </TableCell>
            <TableCell>
              <p className="font-medium">{alert.title}</p>
              <p className="text-xs text-muted-foreground">{alert.mitre}</p>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {alert.source}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {alert.module}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {alert.analyst}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {STATUS_LABEL[alert.status]}
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
              {alert.time}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
