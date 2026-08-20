import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { buildQueryParams, hasNextPage } from "@/lib/query-filters";
import { SEVERITY_ORDER, SEVERITY_LABEL } from "@/lib/severity";
import { NextOnlyPagination } from "@/components/security/next-only-pagination";
import { IncidentsTable } from "@/components/dfir/incidents-table";
import type { AssignableUser } from "@/components/security/assignment-control";
import type { TenantUser } from "@/components/users/users-table";
import type { Severity } from "@/types/security";
import type { DfirIncident } from "@/types/dfir";
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
  return `/dfir?${params.toString()}`;
}

export default async function DfirPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  // Same filter set as VM/SIEM — DfirQueryDto, like VmQueryDto/SiemQueryDto, adds `status`
  // on top of the shared BaseQueryDto.
  const queryParams = buildQueryParams({
    severity: (sp.severity as Severity) || undefined,
    assignedToUserId: sp.assignedToMe === "1" ? session.userId : undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  if (sp.status) queryParams.set("status", sp.status);

  const res = await backendFetchAuthedNoRefresh(
    `/dfir/incidents?${queryParams.toString()}`,
  );
  const incidents: DfirIncident[] = res.ok ? await res.json() : [];

  // Same GET /users constraint as every other module's list page (Phases 3-7) — Admin-only
  // on the backend.
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
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Digital Forensics &amp; Incident Response
        </h1>
        <p className="text-sm text-muted-foreground">
          Incidents tracked for this tenant. Open one for its full trace back to
          the records that led to it.
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
              <span className="text-xs text-muted-foreground">Status</span>
              <select
                name="status"
                defaultValue={sp.status ?? ""}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="ESCALATED">Escalated</option>
                <option value="CONTAINED">Contained</option>
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
                nativeButton={false}
                render={<Link href="/dfir">Clear filters</Link>}
              />
            )}
          </form>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {incidents.length} incident{incidents.length === 1 ? "" : "s"} on
              this page
            </CardTitle>
            <NextOnlyPagination
              page={page}
              hasNextPage={hasNextPage(incidents.length, PAGE_SIZE)}
              buildHref={(p) => hrefForPage(sp, p)}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <IncidentsTable
            incidents={incidents}
            currentUserId={session.userId}
            currentUserRole={session.role}
            assignableUsers={assignableUsers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
