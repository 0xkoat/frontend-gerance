import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { UserRole } from "@/types/auth";
import { roleLabel } from "@/lib/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  let displayName = "Platform Owner";
  let subtitle = "Super Admin — all tenants";

  // GET /users/me is tenant-scoped on the backend (throws ForbiddenException for accounts
  // with no tenantId), so there's no "who am I" endpoint for the two platform-wide roles
  // (Super Admin, Integration Admin) — the JWT claims are all we have for them.
  if (session.role === UserRole.INTEGRATION_ADMIN) {
    displayName = "Integration Admin";
    subtitle = "Platform — module endpoints";
  } else if (session.role !== UserRole.SUPER_ADMIN) {
    const label = roleLabel(session.role, session.analystLevel);
    const res = await backendFetchAuthedNoRefresh("/users/me");
    if (res.ok) {
      const me = (await res.json()) as { name: string; email: string };
      displayName = me.name;
      subtitle = `${label} · ${me.email}`;
    } else {
      displayName = label;
      subtitle = session.tenantId ?? "";
    }
  }

  // Only Admin/Super Admin can have a pending password-change request waiting on them (see
  // backend/CLAUDE.md's "single designated recipient" notification model) — nothing to
  // check for Analyst/Integration Admin, who never see the Users/Tenants nav item anyway.
  let hasPendingPasswordRequest = false;
  let hasPendingIntegrationAdminRequest = false;
  if (
    session.role === UserRole.ADMIN ||
    session.role === UserRole.SUPER_ADMIN
  ) {
    const res = await backendFetchAuthedNoRefresh(
      "/users/me/pending-password-requests",
    );
    if (res.ok) {
      const data = (await res.json()) as {
        hasPending: boolean;
        tenantAdmins?: boolean;
        integrationAdmins?: boolean;
      };
      // A Super Admin gets the two sources separately (Tenants page vs Integration
      // Admins page); an Admin only gets the combined flag.
      hasPendingPasswordRequest = data.tenantAdmins ?? data.hasPending;
      hasPendingIntegrationAdminRequest = data.integrationAdmins ?? false;
    }
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav
        role={session.role}
        displayName={displayName}
        subtitle={subtitle}
        hasPendingPasswordRequest={hasPendingPasswordRequest}
        hasPendingIntegrationAdminRequest={hasPendingIntegrationAdminRequest}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
