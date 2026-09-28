import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { UserRole } from "@/types/auth";
import { EndpointsTable } from "@/components/module-endpoints/endpoints-table";
import type { ModuleEndpoint } from "@/types/modules";

export default async function ModuleEndpointsPage() {
  const session = await requireSession();

  // /module-endpoints is readable by Integration and Super Admins, editable only by the
  // Integration Admin — enforced on the backend; this just avoids a page that would 403.
  if (
    session.role !== UserRole.INTEGRATION_ADMIN &&
    session.role !== UserRole.SUPER_ADMIN
  ) {
    redirect("/dashboard");
  }

  const res = await backendFetchAuthedNoRefresh("/module-endpoints");
  const endpoints: ModuleEndpoint[] = res.ok ? await res.json() : [];
  const canEdit = session.role === UserRole.INTEGRATION_ADMIN;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Module endpoints
        </h1>
        <p className="text-sm text-muted-foreground">
          One shared instance per module, on a private address. Launching a
          module sends the user here. &quot;Test connection&quot; checks from
          the platform&apos;s server, so it confirms the server can reach the
          module, not the user&apos;s browser.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {endpoints.filter((e) => e.host && e.port).length} of{" "}
            {endpoints.length} configured
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <EndpointsTable endpoints={endpoints} canEdit={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
