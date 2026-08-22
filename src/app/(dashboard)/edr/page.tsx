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
import { SEVERITY_ORDER, SEVERITY_LABEL } from "@/lib/severity";
import { FilterFormActions } from "@/components/security/filter-form-actions";
import { ItemCountPagination } from "@/components/security/item-count-pagination";
import { DetectionsTable } from "@/components/edr/detections-table";
import type { AssignableUser } from "@/components/security/assignment-control";
import type { Severity } from "@/types/security";
import type { EdrDetection, EdrEndpoint } from "@/types/edr";
import { UserRole } from "@/types/auth";

const PAGE_SIZE = 20;

type SearchParams = {
  severity?: string;
  assignedToMe?: string;
  page?: string;
};

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

  const assignableUsers: AssignableUser[] = (
    await resolveAssignableTenantUsers(session)
  ).map((u) => ({ id: u.id, name: u.name, role: u.role as UserRole }));

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
            <FilterFormActions
              hasActiveFilters={Boolean(sp.severity || sp.assignedToMe)}
              clearHref="/edr"
            />
          </form>
          <div className="flex items-center justify-between">
            <ItemCountPagination
              count={detections.length}
              singular="detection"
              page={page}
              hasNextPage={hasNextPage(detections.length, PAGE_SIZE)}
              buildHref={(p) => buildModulePageHref("/edr", sp, p)}
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
