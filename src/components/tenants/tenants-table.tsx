import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteTenantButton } from "@/components/tenants/delete-tenant-button";

// Mirrors the real GET /tenants response shape — id, name, createdAt only. No
// activeModules/openIncidents here (those were mock-dashboard-only fields); relations
// aren't included unless the endpoint explicitly says so (see root CLAUDE.md).
export interface TenantSummary {
  id: string;
  name: string;
  createdAt: string;
}

export function TenantsTable({ tenants }: { tenants: TenantSummary[] }) {
  if (tenants.length === 0) {
    return <p className="text-sm text-muted-foreground">No tenants yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenants.map((tenant) => (
          <TableRow key={tenant.id}>
            <TableCell className="font-medium">
              <Link
                href={`/tenants/${tenant.id}`}
                className="hover:underline"
              >
                {tenant.name}
              </Link>
            </TableCell>
            <TableCell className="text-sm tabular-nums text-muted-foreground">
              {new Date(tenant.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <DeleteTenantButton
                tenantId={tenant.id}
                tenantName={tenant.name}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
