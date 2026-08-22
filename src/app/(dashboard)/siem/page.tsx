import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import {
  buildQueryParams,
  buildModulePageHref,
  hasNextPage,
} from "@/lib/query-filters";
import { resolveAssignableTenantUsers } from "@/lib/assignable-users";
import { NextOnlyPagination } from "@/components/security/next-only-pagination";
import { SeverityStatusFilterForm } from "@/components/security/severity-status-filter-form";
import { AlertsTable } from "@/components/siem/alerts-table";
import type { AssignableUser } from "@/components/security/assignment-control";
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

const SIEM_STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "ESCALATED", label: "Escalated" },
  { value: "RESOLVED", label: "Resolved" },
];

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

  const assignableUsers: AssignableUser[] = (
    await resolveAssignableTenantUsers(session)
  ).map((u) => ({ id: u.id, name: u.name, role: u.role as UserRole }));

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
          nativeButton={false}
          render={<Link href="/siem/logs">View raw logs</Link>}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <SeverityStatusFilterForm
            basePath="/siem"
            severity={sp.severity}
            status={sp.status}
            assignedToMe={sp.assignedToMe}
            statusOptions={SIEM_STATUS_OPTIONS}
          />
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {alerts.length} alert{alerts.length === 1 ? "" : "s"} on this page
            </CardTitle>
            <NextOnlyPagination
              page={page}
              hasNextPage={hasNextPage(alerts.length, PAGE_SIZE)}
              buildHref={(p) => buildModulePageHref("/siem", sp, p)}
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
