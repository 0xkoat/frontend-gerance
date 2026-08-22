import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { IncidentsTable } from "@/components/dfir/incidents-table";
import type { AssignableUser } from "@/components/security/assignment-control";
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

const DFIR_STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "INVESTIGATING", label: "Investigating" },
  { value: "ESCALATED", label: "Escalated" },
  { value: "CONTAINED", label: "Contained" },
  { value: "RESOLVED", label: "Resolved" },
];

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

  const assignableUsers: AssignableUser[] = (
    await resolveAssignableTenantUsers(session)
  ).map((u) => ({ id: u.id, name: u.name, role: u.role as UserRole }));

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
          <SeverityStatusFilterForm
            basePath="/dfir"
            severity={sp.severity}
            status={sp.status}
            assignedToMe={sp.assignedToMe}
            statusOptions={DFIR_STATUS_OPTIONS}
          />
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {incidents.length} incident{incidents.length === 1 ? "" : "s"} on
              this page
            </CardTitle>
            <NextOnlyPagination
              page={page}
              hasNextPage={hasNextPage(incidents.length, PAGE_SIZE)}
              buildHref={(p) => buildModulePageHref("/dfir", sp, p)}
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
