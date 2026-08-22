import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TenantModuleRowActions } from "@/components/tenants/tenant-module-row-actions";
import type { TenantModule } from "@/types/security";

// Phase 11 (2026-08-07) — the "which modules is this tenant subscribed to" activation
// surface described in root CLAUDE.md, previously entirely unbuilt (see CLAUDE.md's
// "Known gaps": every tenant created through the real API had zero active modules with no
// UI to change that).
export function TenantModulesTable({
  tenantId,
  modules,
}: {
  tenantId: string;
  modules: TenantModule[];
}) {
  if (modules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No modules configured for this tenant yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Module</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Config</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {modules.map((m) => (
          <TableRow key={m.id}>
            <TableCell className="font-medium">{m.moduleName}</TableCell>
            <TableCell>
              <Badge variant={m.isActive ? "default" : "secondary"}>
                {m.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground">
              {m.config ? JSON.stringify(m.config) : "—"}
            </TableCell>
            <TableCell>
              <TenantModuleRowActions tenantId={tenantId} module={m} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
