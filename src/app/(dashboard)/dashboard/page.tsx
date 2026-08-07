import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { UserRole } from "@/types/auth";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SeverityBreakdown } from "@/components/dashboard/severity-breakdown";
import { TopAttackSources } from "@/components/dashboard/top-attack-sources";
import { AlertsTable } from "@/components/dashboard/alerts-table";
import { mockKpis, mockAlerts } from "@/lib/mock-data";
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

function TenantOverview() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Security Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Illustrative data — the SIEM module isn&apos;t implemented on the
          backend yet.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Critical alerts"
          value={mockKpis.criticalAlerts}
          tone="critical"
        />
        <KpiCard
          label="High alerts"
          value={mockKpis.highAlerts}
          tone="warning"
        />
        <KpiCard label="Open incidents" value={mockKpis.openIncidents} />
        <KpiCard
          label="Resolved today"
          value={mockKpis.resolvedToday}
          tone="good"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopAttackSources />
        <SeverityBreakdown />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent alerts — latest activity across all sources
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <AlertsTable alerts={mockAlerts} />
        </CardContent>
      </Card>
    </div>
  );
}
