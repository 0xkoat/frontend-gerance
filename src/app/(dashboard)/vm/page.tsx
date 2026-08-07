import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { buildQueryParams, hasNextPage } from "@/lib/query-filters";
import { SEVERITY_ORDER, SEVERITY_LABEL } from "@/lib/severity";
import { NextOnlyPagination } from "@/components/security/next-only-pagination";
import { VulnerabilitiesTable } from "@/components/vm/vulnerabilities-table";
import type { AssignableUser } from "@/components/security/assignment-control";
import type { TenantUser } from "@/components/users/users-table";
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

function hrefForPage(sp: SearchParams, page: number): string {
  const params = new URLSearchParams();
  if (sp.severity) params.set("severity", sp.severity);
  if (sp.status) params.set("status", sp.status);
  if (sp.assignedToMe) params.set("assignedToMe", sp.assignedToMe);
  params.set("page", String(page));
  return `/vm?${params.toString()}`;
}

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

  // GET /users is Admin-only on the backend, so only an Admin session can resolve
  // assignedToUserId to a human name via AssignmentControl's picker — an Analyst still gets
  // their own "Assign to me" button (needs no list), a Viewer sees neither. Capped at 100
  // (the backend's own pageSize max) rather than paginating through every tenant user here;
  // flagged rather than silently over/under-fetching, see CLAUDE.md's Phase 2 note on this
  // same tradeoff.
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
            Vulnerability Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Vulnerabilities found across this tenant&apos;s assets.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/vm/assets">Manage assets</Link>}
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
                <option value="REMEDIATED">Remediated</option>
                <option value="ACCEPTED_RISK">Accepted risk</option>
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
                render={<Link href="/vm">Clear filters</Link>}
              />
            )}
          </form>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {vulnerabilities.length} vulnerabilit
              {vulnerabilities.length === 1 ? "y" : "ies"} on this page
            </CardTitle>
            <NextOnlyPagination
              page={page}
              hasNextPage={hasNextPage(vulnerabilities.length, PAGE_SIZE)}
              buildHref={(p) => hrefForPage(sp, p)}
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
