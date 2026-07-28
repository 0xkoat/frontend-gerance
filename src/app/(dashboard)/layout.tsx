import { requireSession } from "@/lib/session";
import { backendFetchAuthed } from "@/lib/backend";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { UserRole } from "@/types/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  let displayName = "Platform Owner";
  let subtitle = "Super Admin — all tenants";

  // GET /users/me is tenant-scoped on the backend (throws ForbiddenException for accounts
  // with no tenantId), so there's no equivalent "who am I" endpoint for a Super Admin today.
  // Nothing to fetch for that role — the JWT claims are all we have.
  if (session.role !== UserRole.SUPER_ADMIN) {
    const res = await backendFetchAuthed("/users/me");
    if (res.ok) {
      const me = (await res.json()) as { name: string; email: string };
      displayName = me.name;
      subtitle = `${session.role} · ${me.email}`;
    } else {
      displayName = session.role;
      subtitle = session.tenantId ?? "";
    }
  }

  // Only Admin/Super Admin can have a pending password-change request waiting on them (see
  // backend/CLAUDE.md's "single designated recipient" notification model) — nothing to
  // check for Analyst/Viewer, who never see the Users/Tenants nav item anyway.
  let hasPendingPasswordRequest = false;
  if (session.role === UserRole.ADMIN || session.role === UserRole.SUPER_ADMIN) {
    const res = await backendFetchAuthed("/users/me/pending-password-requests");
    if (res.ok) {
      const data = (await res.json()) as { hasPending: boolean };
      hasPendingPasswordRequest = data.hasPending;
    }
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav
        role={session.role}
        displayName={displayName}
        subtitle={subtitle}
        hasPendingPasswordRequest={hasPendingPasswordRequest}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
