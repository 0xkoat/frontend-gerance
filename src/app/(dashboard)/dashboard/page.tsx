import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { UserRole } from "@/types/auth";
import type { TenantSummary } from "@/components/tenants/tenants-table";
import { ModuleTiles } from "@/components/modules/module-tiles";
import type { AvailableModule } from "@/types/modules";
import type { Ticket } from "@/types/tickets";

export default async function DashboardPage() {
  const session = await requireSession();

  if (session.role === UserRole.SUPER_ADMIN) {
    return <SuperAdminOverview />;
  }
  if (session.role === UserRole.INTEGRATION_ADMIN) {
    return <IntegrationAdminOverview />;
  }

  return <TenantOverview role={session.role} />;
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
// The modules this user may open (GET /modules already hides the ones above an Analyst's
// level). Support tickets join this page in Phase 4.
async function TenantOverview({ role }: { role: UserRole }) {
  const res = await backendFetchAuthedNoRefresh("/modules");
  const modules: AvailableModule[] = res.ok ? await res.json() : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Security modules
        </h1>
        <p className="text-sm text-muted-foreground">
          Each module opens its own platform on the internal network. You need
          to be on that network (or VPN) for it to load.
        </p>
      </div>
      <ModuleTiles modules={modules} showLevels={role === UserRole.ADMIN} />
    </div>
  );
}

// The Integration Admin's two jobs: keep module endpoints right, and handle Modules
// tickets from every tenant.
async function IntegrationAdminOverview() {
  const res = await backendFetchAuthedNoRefresh("/tickets");
  const tickets: Ticket[] = res.ok ? await res.json() : [];
  const open = tickets.filter((t) => t.status === "OPEN").length;
  const inProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Set where each module lives and check it&apos;s reachable on the{" "}
          <Link
            href="/module-endpoints"
            className="underline underline-offset-4"
          >
            module endpoints
          </Link>{" "}
          page.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open module tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{open}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In progress
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {inProgress}
          </CardContent>
        </Card>
      </div>
      <Link href="/tickets" className="text-sm underline underline-offset-4">
        Go to tickets
      </Link>
    </div>
  );
}
