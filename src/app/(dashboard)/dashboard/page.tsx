import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { UserRole } from "@/types/auth";
import type { TenantSummary } from "@/components/tenants/tenants-table";

export default async function DashboardPage() {
  const session = await requireSession();

  if (session.role === UserRole.SUPER_ADMIN) {
    return <SuperAdminOverview />;
  }

  return <TenantOverview />;
}

// Super Admin isn't bound to a tenant (tenantId is always null — see root CLAUDE.md's API
// contract), so there's no single tenant's KPIs to show — this pulls real GET /tenants data
// (id, name, createdAt only; no per-tenant alert/incident counts exist on the backend yet,
// so this is a distinct view rather than the same dashboard with a tenant switcher).
async function SuperAdminOverview() {
  const res = await backendFetchAuthedNoRefresh("/tenants");
  const tenants: TenantSummary[] = res.ok ? await res.json() : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Platform Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            {tenants.length} {tenants.length === 1 ? "tenant" : "tenants"}
          </p>
        </div>
        <Link
          href="/tenants"
          className="text-sm underline underline-offset-4 hover:text-foreground"
        >
          Manage tenants
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardHeader>
              <CardTitle className="text-base">{tenant.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Created {new Date(tenant.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {tenants.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No tenants yet —{" "}
          <Link href="/tenants" className="underline underline-offset-4">
            create the first one
          </Link>
          .
        </p>
      )}
    </div>
  );
}

// Placeholder while the module data layer is gone (v2 redesign): the module launcher
// (Phase 3) and ticket summary (Phase 4) replace this.
function TenantOverview() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
      <p className="text-sm text-muted-foreground">
        Security modules and support tickets will be available here.
      </p>
    </div>
  );
}
