import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { hasNextPage } from "@/lib/query-filters";
import { NextOnlyPagination } from "@/components/security/next-only-pagination";
import { PlaybooksTable } from "@/components/soar/playbooks-table";
import { ExecutionsTable } from "@/components/soar/executions-table";
import { CreatePlaybookForm } from "@/components/soar/create-playbook-form";
import type { SoarExecution, SoarPlaybook } from "@/types/soar";
import { UserRole } from "@/types/auth";

const PAGE_SIZE = 20;

export default async function SoarPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireSession();
  const page = Math.max(1, Number((await searchParams).page) || 1);

  const [playbooksRes, executionsRes] = await Promise.all([
    backendFetchAuthedNoRefresh("/soar/playbooks"),
    backendFetchAuthedNoRefresh(
      `/soar/executions?page=${page}&pageSize=${PAGE_SIZE}`,
    ),
  ]);
  const playbooks: SoarPlaybook[] = playbooksRes.ok
    ? await playbooksRes.json()
    : [];
  const executions: SoarExecution[] = executionsRes.ok
    ? await executionsRes.json()
    : [];
  const playbooksById = Object.fromEntries(playbooks.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Security Orchestration, Automation &amp; Response
        </h1>
        <p className="text-sm text-muted-foreground">
          Playbooks and their executions for this tenant.
        </p>
      </div>

      <div
        className={
          session.role === UserRole.ADMIN
            ? "grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]"
            : "grid grid-cols-1 gap-4"
        }
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {playbooks.length} playbook{playbooks.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <PlaybooksTable
              playbooks={playbooks}
              currentUserRole={session.role}
            />
          </CardContent>
        </Card>

        {session.role === UserRole.ADMIN && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Create playbook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CreatePlaybookForm />
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {executions.length} execution{executions.length === 1 ? "" : "s"} on
            this page
          </CardTitle>
          <NextOnlyPagination
            page={page}
            hasNextPage={hasNextPage(executions.length, PAGE_SIZE)}
            buildHref={(p) => `/soar?page=${p}`}
          />
        </CardHeader>
        <CardContent className="px-0">
          <ExecutionsTable
            executions={executions}
            playbooksById={playbooksById}
          />
        </CardContent>
      </Card>
    </div>
  );
}
