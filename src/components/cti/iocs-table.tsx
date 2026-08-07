import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { IocRowActions } from "@/components/cti/ioc-row-actions";
import type { CtiIoc } from "@/types/cti";
import type { UserRole } from "@/types/auth";

export function IocsTable({
  iocs,
  currentUserRole,
}: {
  iocs: CtiIoc[];
  currentUserRole: UserRole;
}) {
  if (iocs.length === 0) {
    return <p className="text-sm text-muted-foreground">No IOCs found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Source</TableHead>
          {currentUserRole !== "VIEWER" && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {iocs.map((ioc) => (
          <TableRow key={ioc.id}>
            <TableCell>
              <Badge variant="outline">{ioc.type}</Badge>
            </TableCell>
            <TableCell className="font-mono text-xs">{ioc.value}</TableCell>
            <TableCell className="text-sm tabular-nums text-muted-foreground">
              {ioc.confidence}%
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {ioc.source}
            </TableCell>
            {currentUserRole !== "VIEWER" && (
              <TableCell>
                <IocRowActions ioc={ioc} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
