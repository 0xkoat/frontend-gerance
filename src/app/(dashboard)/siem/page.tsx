import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { buildQueryParams, hasNextPage } from "@/lib/query-filters";
import { SEVERITY_ORDER, SEVERITY_LABEL } from "@/lib/severity";
import { NextOnlyPagination } from "@/components/security/next-only-pagination";
import { AlertsTable } from "@/components/siem/alerts-table";
import type { AssignableUser } from "@/components/security/assignment-control";
import type { TenantUser } from "@/components/users/users-table";
import type { Severity } from "@/types/security";
import type { SiemAlert } from "@/types/siem";
import { UserRole } from "@/types/auth";

const PAGE_SIZE = 20;

type SearchParams = {
  severity?: string;
  status?: string;
  assignedToMe?: string;
  page?: string;
};

function hrefForPage(sp: SearchParams, page: number): string {
  const params = new URLSearchParams();
  if (sp.severity) params.set("severity", sp.severity);
  if (sp.status) params.set("status", sp.status);
  if (sp.assignedToMe) params.set("assignedToMe", sp.assignedToMe);
  params.set("page", String(page));
  return `/siem?${params.toString()}`;
}

export default async function SiemPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  // Same filter set as VM (SiemQueryDto, like VmQueryDto, adds `status` on top of the shared
  // BaseQueryDto) — unlike EDR, which doesn't support a status filter at all.
  const queryParams = buildQueryParams({
    severity: (sp.severity as Severity) || undefined,
    assignedToUserId: sp.assignedToMe === "1" ? session.userId : undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  if (sp.status) queryParams.set("status", sp.status);

  const res = await backendFetchAuthedNoRefresh(
    `/siem/alerts?${queryParams.toString()}`,
  );
  const alerts: SiemAlert[] = res.ok ? await res.json() : [];

  // Same GET /users constraint as VM/EDR (Phases 3-4) — Admin-only on the backend.
  let assignableUsers: AssignableUser[] = [];
  if (session.role === UserRole.ADMIN) {
    const usersRes = await backendFetchAuthedNoRefresh("/users?pageSize=100");
    if (usersRes.ok) {
      const data = (await usersRes.json()) as { users: TenantUser[] };
      assignableUsers = data.users
        .filter((u) => u.role === "ADMIN" || u.role === "ANALYST")
        .map((u) => ({ id: u.id, name: u.name, role: u.role as UserRole }));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Security Information &amp; Event Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Alerts raised across this tenant&apos;s log sources.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/siem/logs">View raw logs</Link>}
        />
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
              <span className="text-xs text-muted-foreground">Status</span>
              <select
                name="status"
                defaultValue={sp.status ?? ""}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="ESCALATED">Escalated</option>
                <option value="RESOLVED">Resolved</option>
              </select>
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
            {(sp.severity || sp.status || sp.assignedToMe) && (
              <Button
                size="sm"
                variant="ghost"
                render={<Link href="/siem">Clear filters</Link>}
              />
            )}
          </form>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {alerts.length} alert{alerts.length === 1 ? "" : "s"} on this page
            </CardTitle>
            <NextOnlyPagination
              page={page}
              hasNextPage={hasNextPage(alerts.length, PAGE_SIZE)}
              buildHref={(p) => hrefForPage(sp, p)}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <AlertsTable
            alerts={alerts}
            currentUserId={session.userId}
            currentUserRole={session.role}
            assignableUsers={assignableUsers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
