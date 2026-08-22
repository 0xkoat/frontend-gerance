import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { UserRole } from "@/types/auth";
import {
  TenantsTable,
  type TenantSummary,
} from "@/components/tenants/tenants-table";
import { CreateTenantForm } from "@/components/tenants/create-tenant-form";

export default async function TenantsPage() {
  const session = await requireSession();

  // Same defense-in-depth reasoning as (dashboard)/users/page.tsx: GET/POST /tenants are
  // already @Roles(UserRole.SUPER_ADMIN)-gated on the backend, and
  // src/app/api/tenants/route.ts re-checks this too — this just avoids rendering a page
  // whose data call will 403 anyway.
  if (session.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  const res = await backendFetchAuthedNoRefresh("/tenants");
  const tenants: TenantSummary[] = res.ok ? await res.json() : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tenants</h1>
        <p className="text-sm text-muted-foreground">
          Every tenant is created here, with its first Admin account in the same
          step — there&apos;s no other way to provision one.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tenants.length} {tenants.length === 1 ? "tenant" : "tenants"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <TenantsTable tenants={tenants} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Create tenant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateTenantForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
