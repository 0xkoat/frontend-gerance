import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { buildQueryParams, hasNextPage } from "@/lib/query-filters";
import { SEVERITY_ORDER, SEVERITY_LABEL } from "@/lib/severity";
import { NextOnlyPagination } from "@/components/security/next-only-pagination";
import { DetectionsTable } from "@/components/edr/detections-table";
import type { AssignableUser } from "@/components/security/assignment-control";
import type { TenantUser } from "@/components/users/users-table";
import type { Severity } from "@/types/security";
import type { EdrDetection, EdrEndpoint } from "@/types/edr";
import { UserRole } from "@/types/auth";

const PAGE_SIZE = 20;

type SearchParams = {
  severity?: string;
  assignedToMe?: string;
  page?: string;
};

function hrefForPage(sp: SearchParams, page: number): string {
  const params = new URLSearchParams();
  if (sp.severity) params.set("severity", sp.severity);
  if (sp.assignedToMe) params.set("assignedToMe", sp.assignedToMe);
  params.set("page", String(page));
  return `/edr?${params.toString()}`;
}

export default async function EdrPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  // No status filter here, unlike VM — EdrQueryDto (unlike VmQueryDto) only extends the
  // shared BaseQueryDto with `endpointId`, no `status`. Not built as a fake client-side-only
  // filter over an unfiltered fetch; the filter set here matches what the backend actually
  // supports.
  const queryParams = buildQueryParams({
    severity: (sp.severity as Severity) || undefined,
    assignedToUserId: sp.assignedToMe === "1" ? session.userId : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const [detectionsRes, endpointsRes] = await Promise.all([
    backendFetchAuthedNoRefresh(`/edr/detections?${queryParams.toString()}`),
    backendFetchAuthedNoRefresh("/edr/endpoints"),
  ]);
  const detections: EdrDetection[] = detectionsRes.ok
    ? await detectionsRes.json()
    : [];
  const endpoints: EdrEndpoint[] = endpointsRes.ok
    ? await endpointsRes.json()
    : [];
  const endpointsById = Object.fromEntries(endpoints.map((e) => [e.id, e]));

  // Same GET /users constraint as VM's page (Phase 3) — Admin-only on the backend, so only
  // an Admin session can resolve assignedToUserId to a name.
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
            Endpoint Detection &amp; Response
          </h1>
          <p className="text-sm text-muted-foreground">
            Detections found across this tenant&apos;s endpoints.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/edr/endpoints">Manage endpoints</Link>}
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
            {(sp.severity || sp.assignedToMe) && (
              <Button
                size="sm"
                variant="ghost"
                nativeButton={false}
                render={<Link href="/edr">Clear filters</Link>}
              />
            )}
          </form>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {detections.length} detection{detections.length === 1 ? "" : "s"}{" "}
              on this page
            </CardTitle>
            <NextOnlyPagination
              page={page}
              hasNextPage={hasNextPage(detections.length, PAGE_SIZE)}
              buildHref={(p) => hrefForPage(sp, p)}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <DetectionsTable
            detections={detections}
            endpointsById={endpointsById}
            currentUserId={session.userId}
            currentUserRole={session.role}
            assignableUsers={assignableUsers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
