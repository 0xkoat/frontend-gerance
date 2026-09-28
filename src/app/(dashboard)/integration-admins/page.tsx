import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { UserRole } from "@/types/auth";
import {
  IntegrationAdminsTable,
  type IntegrationAdmin,
} from "@/components/integration-admins/integration-admins-table";
import { CreateIntegrationAdminForm } from "@/components/integration-admins/create-integration-admin-form";

export default async function IntegrationAdminsPage() {
  const session = await requireSession();

  // /integration-admins is @Roles(SUPER_ADMIN)-gated on the backend and the Route
  // Handlers re-check it — this just avoids rendering a page whose data call will 403.
  if (session.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  const res = await backendFetchAuthedNoRefresh("/integration-admins");
  const admins: IntegrationAdmin[] = res.ok ? await res.json() : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Integration Admins
        </h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide accounts that manage module endpoints and handle module
          tickets. They don&apos;t belong to any tenant.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {admins.length}{" "}
              {admins.length === 1 ? "Integration Admin" : "Integration Admins"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <IntegrationAdminsTable admins={admins} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Create Integration Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateIntegrationAdminForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
