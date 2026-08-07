import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { hasNextPage } from "@/lib/query-filters";
import { NextOnlyPagination } from "@/components/security/next-only-pagination";
import { IocsTable } from "@/components/cti/iocs-table";
import { CreateIocForm } from "@/components/cti/create-ioc-form";
import type { CtiIoc } from "@/types/cti";
import { CtiIocType } from "@/types/cti";
import { UserRole } from "@/types/auth";

const PAGE_SIZE = 20;

type SearchParams = {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
};

function hrefForPage(sp: SearchParams, page: number): string {
  const params = new URLSearchParams();
  if (sp.type) params.set("type", sp.type);
  if (sp.dateFrom) params.set("dateFrom", sp.dateFrom);
  if (sp.dateTo) params.set("dateTo", sp.dateTo);
  params.set("page", String(page));
  return `/cti?${params.toString()}`;
}

export default async function CtiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  // No severity/assignedToUserId filters here — CtiIoc has neither field, and
  // CtiService.query() silently ignores those two BaseQueryDto fields when present (see the
  // Route Handler's own comment). Just type + the shared date range + pagination.
  const params = new URLSearchParams();
  if (sp.type) params.set("type", sp.type);
  if (sp.dateFrom) params.set("dateFrom", sp.dateFrom);
  if (sp.dateTo) params.set("dateTo", sp.dateTo);
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));

  const res = await backendFetchAuthedNoRefresh(
    `/cti/iocs?${params.toString()}`,
  );
  const iocs: CtiIoc[] = res.ok ? await res.json() : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Cyber Threat Intelligence
        </h1>
        <p className="text-sm text-muted-foreground">
          Indicators of compromise tracked for this tenant.
        </p>
      </div>

      <div
        className={
          session.role === UserRole.VIEWER
            ? "grid grid-cols-1 gap-4"
            : "grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]"
        }
      >
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <form
              method="GET"
              className="flex flex-wrap items-end gap-3 text-sm"
            >
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Type</span>
                <select
                  name="type"
                  defaultValue={sp.type ?? ""}
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                >
                  <option value="">All</option>
                  {Object.values(CtiIocType).map((t) => (
                    <option key={t} value={t}>
                      {t}
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
              <Button type="submit" size="sm" variant="outline">
                Apply
              </Button>
              {(sp.type || sp.dateFrom || sp.dateTo) && (
                <Button
                  size="sm"
                  variant="ghost"
                  render={<Link href="/cti">Clear filters</Link>}
                />
              )}
            </form>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {iocs.length} IOC{iocs.length === 1 ? "" : "s"} on this page
              </CardTitle>
              <NextOnlyPagination
                page={page}
                hasNextPage={hasNextPage(iocs.length, PAGE_SIZE)}
                buildHref={(p) => hrefForPage(sp, p)}
              />
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <IocsTable iocs={iocs} currentUserRole={session.role} />
          </CardContent>
        </Card>

        {session.role !== UserRole.VIEWER && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Add IOC
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CreateIocForm />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
