import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type {
  SoarExecution,
  SoarExecutionStatus,
  SoarPlaybook,
} from "@/types/soar";

const STATUS_VARIANT: Record<SoarExecutionStatus, "default" | "outline"> = {
  PENDING: "outline",
  RUNNING: "outline",
  SUCCESS: "default",
  FAILED: "outline",
};

// Read-only for every role — no assign/status routes exist for SoarExecution at all, it's
// already terminal by the time a human sees it (see this module's own Route Handler
// comment).
export function ExecutionsTable({
  executions,
  playbooksById,
}: {
  executions: SoarExecution[];
  playbooksById: Record<string, SoarPlaybook>;
}) {
  if (executions.length === 0) {
    return <p className="text-sm text-muted-foreground">No executions yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Playbook</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Logs</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {executions.map((execution) => {
          const playbook = playbooksById[execution.playbookId];
          return (
            <TableRow key={execution.id}>
              <TableCell className="text-sm text-muted-foreground">
                {playbook ? playbook.name : execution.playbookId}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[execution.status]}>
                  {execution.status}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                {execution.logs ?? "—"}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {new Date(execution.createdAt).toLocaleString()}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
