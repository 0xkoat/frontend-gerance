import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { UserRole } from "@/types/auth";
import type { TenantUser } from "@/components/users/users-table";
import { TenantAdminsTable } from "@/components/tenants/tenant-admins-table";
import { TenantModulesTable } from "@/components/tenants/tenant-modules-table";
import { ActivateModuleForm } from "@/components/tenants/activate-module-form";
import type { TenantModule } from "@/types/security";

interface TenantDetail {
  id: string;
  name: string;
  createdAt: string;
  admins: TenantUser[];
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();

  if (session.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const res = await backendFetchAuthedNoRefresh(`/tenants/${id}`);
  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    throw new Error(`Failed to load tenant ${id}: ${res.status}`);
  }
  const tenant: TenantDetail = await res.json();

  // Phase 11 (2026-08-07) — the module activation surface itself. A separate call rather
  // than folding into GET /tenants/:id, matching the backend's own separate
  // GET /tenants/:id/modules route (findById doesn't include TenantModule rows).
  const modulesRes = await backendFetchAuthedNoRefresh(
    `/tenants/${id}/modules`,
  );
  const modules: TenantModule[] = modulesRes.ok ? await modulesRes.json() : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/tenants"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All tenants
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          {tenant.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Created {new Date(tenant.createdAt).toLocaleDateString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {tenant.admins.length}{" "}
            {tenant.admins.length === 1 ? "Admin" : "Admins"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <TenantAdminsTable admins={tenant.admins} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {modules.length} {modules.length === 1 ? "module" : "modules"}{" "}
              configured
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <TenantModulesTable tenantId={tenant.id} modules={modules} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activate module
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivateModuleForm
              tenantId={tenant.id}
              alreadyActive={modules.map((m) => m.moduleName)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
