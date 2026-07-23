import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { backendFetchAuthed } from "@/lib/backend";
import { UserRole } from "@/types/auth";
import type { TenantUser } from "@/components/users/users-table";
import { TenantAdminsTable } from "@/components/tenants/tenant-admins-table";

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
  const res = await backendFetchAuthed(`/tenants/${id}`);
  if (res.status === 404) {
    notFound();
  }
  const tenant: TenantDetail = await res.json();

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
    </div>
  );
}
