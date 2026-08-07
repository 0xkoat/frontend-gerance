import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { buildQueryParams, hasNextPage } from "@/lib/query-filters";
import { SEVERITY_ORDER, SEVERITY_LABEL } from "@/lib/severity";
import { NextOnlyPagination } from "@/components/security/next-only-pagination";
import { FeedTable } from "@/components/assets/feed-table";
import { LiveEvents } from "@/components/security/live-events";
import type { TenantUser } from "@/components/users/users-table";
import type { Severity } from "@/types/security";
import type { AssetFeedEntry } from "@/types/assets";
import { UserRole } from "@/types/auth";

const PAGE_SIZE = 20;

type SearchParams = {
  severity?: string;
  assignedToMe?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
};

function hrefForPage(sp: SearchParams, page: number): string {
  const params = new URLSearchParams();
  if (sp.severity) params.set("severity", sp.severity);
  if (sp.assignedToMe) params.set("assignedToMe", sp.assignedToMe);
  if (sp.dateFrom) params.set("dateFrom", sp.dateFrom);
  if (sp.dateTo) params.set("dateTo", sp.dateTo);
  params.set("page", String(page));
  return `/assets?${params.toString()}`;
}

// The unified cross-module feed (GET /assets/feed) — every module's created/assigned/
// status-changed events, materialized into one indexed, paginated view (see
// backend/src/asset/asset.service.ts's own comment on why). Filters mirror the shared
// BaseQueryDto exactly: severity, assignedToMe, and a date range — no module-specific
// filters exist here, this endpoint doesn't take any.
export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const queryParams = buildQueryParams({
    severity: (sp.severity as Severity) || undefined,
    assignedToUserId: sp.assignedToMe === "1" ? session.userId : undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  if (sp.dateFrom) queryParams.set("dateFrom", sp.dateFrom);
  if (sp.dateTo) queryParams.set("dateTo", sp.dateTo);

  const res = await backendFetchAuthedNoRefresh(
    `/assets/feed?${queryParams.toString()}`,
  );
  const entries: AssetFeedEntry[] = res.ok ? await res.json() : [];

  // Same GET /users constraint as every module list page since Phase 3 — Admin-only on the
  // backend, so only an Admin session can resolve an assignee's name; Analyst/Viewer still
  // see "You" on their own rows via FeedTable's currentUserId check.
  let userNameById: Record<string, string> = {};
  if (session.role === UserRole.ADMIN) {
    const usersRes = await backendFetchAuthedNoRefresh("/users?pageSize=100");
    if (usersRes.ok) {
      const data = (await usersRes.json()) as { users: TenantUser[] };
      userNameById = Object.fromEntries(data.users.map((u) => [u.id, u.name]));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Super Admin has no tenantId — GET /events/stream's requireTenantId() would just
          reject the connection, matching this page's own graceful empty state for the same
          role/reason, so LiveEvents is skipped rather than opening a connection that can
          never succeed. */}
      {session.role !== UserRole.SUPER_ADMIN && <LiveEvents />}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Asset Feed</h1>
        <p className="text-sm text-muted-foreground">
          Every event across SIEM, EDR, VM, CTI, SOAR, and DFIR for this tenant,
          newest first.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <form method="GET" className="flex flex-wrap items-end gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Severity</span>
              <select
                name="severity"
                defaultValue={sp.severity ?? ""}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="">All</option>
                {SEVERITY_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">From</span>
              <input
                type="date"
                name="dateFrom"
                defaultValue={sp.dateFrom ?? ""}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">To</span>
              <input
                type="date"
                name="dateTo"
                defaultValue={sp.dateTo ?? ""}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                name="assignedToMe"
                value="1"
                defaultChecked={sp.assignedToMe === "1"}
              />
              Assigned to me
            </label>
            <Button type="submit" size="sm" variant="outline">
              Apply
            </Button>
            {(sp.severity || sp.assignedToMe || sp.dateFrom || sp.dateTo) && (
              <Button
                size="sm"
                variant="ghost"
                render={<Link href="/assets">Clear filters</Link>}
              />
            )}
          </form>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {entries.length} event{entries.length === 1 ? "" : "s"} on this
              page
            </CardTitle>
            <NextOnlyPagination
              page={page}
              hasNextPage={hasNextPage(entries.length, PAGE_SIZE)}
              buildHref={(p) => hrefForPage(sp, p)}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <FeedTable
            entries={entries}
            currentUserId={session.userId}
            userNameById={userNameById}
          />
        </CardContent>
      </Card>
    </div>
  );
}
