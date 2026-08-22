import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import {
  buildQueryParams,
  buildModulePageHref,
  hasNextPage,
} from "@/lib/query-filters";
import { resolveAssignableTenantUsers } from "@/lib/assignable-users";
import { SeverityStatusFilterForm } from "@/components/security/severity-status-filter-form";
import { ItemCountPagination } from "@/components/security/item-count-pagination";
import { VulnerabilitiesTable } from "@/components/vm/vulnerabilities-table";
import type { AssignableUser } from "@/components/security/assignment-control";
import type { Severity } from "@/types/security";
import type { VmAsset, VmVulnerability } from "@/types/vm";
import { UserRole } from "@/types/auth";

const PAGE_SIZE = 20;

type SearchParams = {
  severity?: string;
  status?: string;
  assignedToMe?: string;
  page?: string;
};

const VM_STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "REMEDIATED", label: "Remediated" },
  { value: "ACCEPTED_RISK", label: "Accepted risk" },
];

export default async function VmPage({
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
  if (sp.status) queryParams.set("status", sp.status);

  const [vulnerabilitiesRes, assetsRes] = await Promise.all([
    backendFetchAuthedNoRefresh(
      `/vm/vulnerabilities?${queryParams.toString()}`,
    ),
    backendFetchAuthedNoRefresh("/vm/assets"),
  ]);
  const vulnerabilities: VmVulnerability[] = vulnerabilitiesRes.ok
    ? await vulnerabilitiesRes.json()
    : [];
  const assets: VmAsset[] = assetsRes.ok ? await assetsRes.json() : [];
  const assetsById = Object.fromEntries(assets.map((a) => [a.id, a]));

  const assignableUsers: AssignableUser[] = (
    await resolveAssignableTenantUsers(session)
  ).map((u) => ({ id: u.id, name: u.name, role: u.role as UserRole }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Vulnerability Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Vulnerabilities found across this tenant&apos;s assets.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/vm/assets">Manage assets</Link>}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <SeverityStatusFilterForm
            basePath="/vm"
            severity={sp.severity}
            status={sp.status}
            assignedToMe={sp.assignedToMe}
            statusOptions={VM_STATUS_OPTIONS}
          />
          <div className="flex items-center justify-between">
            <ItemCountPagination
              count={vulnerabilities.length}
              singular="vulnerability"
              plural="vulnerabilities"
              page={page}
              hasNextPage={hasNextPage(vulnerabilities.length, PAGE_SIZE)}
              buildHref={(p) => buildModulePageHref("/vm", sp, p)}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <VulnerabilitiesTable
            vulnerabilities={vulnerabilities}
            assetsById={assetsById}
            currentUserId={session.userId}
            currentUserRole={session.role}
            assignableUsers={assignableUsers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
