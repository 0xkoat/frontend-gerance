import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { UserRole } from "@/types/auth";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SeverityBreakdown } from "@/components/dashboard/severity-breakdown";
import { EventsByModule } from "@/components/dashboard/events-by-module";
import { FeedTable } from "@/components/assets/feed-table";
import { LiveEvents } from "@/components/security/live-events";
import { isOpenFeedEntry } from "@/lib/asset-feed";
import type { TenantSummary } from "@/components/tenants/tenants-table";
import type { AssetFeedEntry } from "@/types/assets";

// The largest page size GET /assets/feed accepts (BaseQueryDto's @Max(100)) — see
// TenantOverview's own comment for why this snapshot, not a true tenant-wide total, is what
// backs every number below.
const FEED_SNAPSHOT_SIZE = 100;
// How many of the snapshot's rows the "recent activity" table actually lists — the
// breakdown panels use the full snapshot, the table itself doesn't need 100 rows visible.
const RECENT_ACTIVITY_ROWS = 8;

export default async function DashboardPage() {
  const session = await requireSession();

  if (session.role === UserRole.SUPER_ADMIN) {
    return <SuperAdminOverview />;
  }

  return <TenantOverview userId={session.userId} />;
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

// Real data since Phase 9 (2026-08-07), sourced entirely from GET /assets/feed — the four
// KPIs, both breakdown panels, and the recent-activity table below all derive from one
// fetch of the most recent FEED_SNAPSHOT_SIZE events, not a true tenant-wide aggregate.
// That's a deliberate, documented limit (CLAUDE.md's adaptation plan, decision 10): none of
// the six modules' query() methods or getUnifiedFeed itself return a total count (see
// CLAUDE.md's "Known gaps"), so an honest dashboard can only describe what it actually
// fetched, not claim a full history it can't verify. The four KPIs this replaces the old
// mock ones with were chosen because they're the only ones actually answerable from this
// shape: "resolved today" (the original mock's fourth KPI) has no honest replacement at
// all — AssetFeedEntry has no resolved-at/updated-at timestamp, only `timestamp` (the
// record's *creation* time, never touched again on a status change, see
// backend/src/asset/asset.service.ts's applyStatusChange) — so it's dropped rather than
// faked, not silently kept.
async function TenantOverview({ userId }: { userId: string }) {
  const res = await backendFetchAuthedNoRefresh(
    `/assets/feed?pageSize=${FEED_SNAPSHOT_SIZE}`,
  );
  const entries: AssetFeedEntry[] = res.ok ? await res.json() : [];

  const criticalCount = entries.filter((e) => e.severity === "CRITICAL").length;
  const highCount = entries.filter((e) => e.severity === "HIGH").length;
  const openCount = entries.filter(isOpenFeedEntry).length;
  const assignedToMeCount = entries.filter(
    (e) => e.assignedToUserId === userId,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <LiveEvents />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Security Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Based on the {entries.length} most recent event
          {entries.length === 1 ? "" : "s"} across SIEM, EDR, VM, CTI, SOAR, and
          DFIR —{" "}
          <Link href="/assets" className="underline underline-offset-4">
            see the full feed
          </Link>
          .
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Critical events"
          value={criticalCount}
          tone="critical"
        />
        <KpiCard label="High severity" value={highCount} tone="warning" />
        <KpiCard label="Open records" value={openCount} />
        <KpiCard label="Assigned to me" value={assignedToMeCount} tone="good" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EventsByModule entries={entries} />
        <SeverityBreakdown entries={entries} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent activity — latest events across all modules
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <FeedTable
            entries={entries.slice(0, RECENT_ACTIVITY_ROWS)}
            currentUserId={userId}
            userNameById={{}}
          />
        </CardContent>
      </Card>
    </div>
  );
}
