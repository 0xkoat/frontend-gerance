"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Cable,
  LifeBuoy,
  SlidersHorizontal,
  ExternalLink,
  Network,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/auth";
import type { AvailableModule } from "@/types/modules";
import { useLaunchModule } from "@/components/modules/use-launch-module";

interface SidebarNavProps {
  role: UserRole;
  displayName: string;
  subtitle: string;
  hasPendingPasswordRequest?: boolean;
  hasPendingIntegrationAdminRequest?: boolean;
  modules?: AvailableModule[];
}

export function SidebarNav({
  role,
  displayName,
  subtitle,
  hasPendingPasswordRequest = false,
  hasPendingIntegrationAdminRequest = false,
  modules = [],
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const { launch, launching } = useLaunchModule();
  const launchable = modules.filter((m) => m.canLaunch);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <BrandMark className="h-7 w-7 shrink-0" />
        <span className="text-sm font-semibold tracking-wide">
          SEC<span className="text-muted-foreground">OPS</span>
        </span>
        <span
          aria-hidden
          className="signal-dot ml-auto size-1.5 rounded-full bg-[#0ca30c]"
        />
        <span className="sr-only">All systems monitoring</span>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        <div className="flex flex-col gap-1">
          <p className="px-2 text-xs font-medium tracking-wider text-muted-foreground">
            PLATFORM
          </p>
          <NavLink href="/dashboard" active={pathname === "/dashboard"}>
            <LayoutDashboard className="size-4" />
            Dashboard
          </NavLink>
          {(role === UserRole.ADMIN ||
            role === UserRole.ANALYST ||
            role === UserRole.INTEGRATION_ADMIN) && (
            <NavLink href="/tickets" active={pathname === "/tickets"}>
              <LifeBuoy className="size-4" />
              Tickets
            </NavLink>
          )}
          {/* hasPendingPasswordRequest drives the red dot for
              GET /users/me/pending-password-requests — a single designated
              recipient per tenant (the first-created Admin), or every Super
              Admin when that first Admin's own request is the one pending.
              An Integration Admin's request gets its own dot on the
              Integration Admins link (hasPendingIntegrationAdminRequest).
              See backend/CLAUDE.md's provisioning rules for the exact
              targeting logic; this component just renders whatever the
              caller (the dashboard layout, which polls that endpoint)
              passed in. */}
          {role === UserRole.ADMIN && (
            <NavLink
              href="/users"
              active={pathname === "/users"}
              showDot={hasPendingPasswordRequest}
            >
              <Users className="size-4" />
              Users
            </NavLink>
          )}
          {role === UserRole.ADMIN && (
            <NavLink
              href="/module-access"
              active={pathname === "/module-access"}
            >
              <SlidersHorizontal className="size-4" />
              Module access
            </NavLink>
          )}
          {role === UserRole.SUPER_ADMIN && (
            <NavLink
              href="/tenants"
              active={pathname === "/tenants"}
              showDot={hasPendingPasswordRequest}
            >
              <Building2 className="size-4" />
              Tenants
            </NavLink>
          )}
          {role === UserRole.SUPER_ADMIN && (
            <NavLink
              href="/integration-admins"
              active={pathname === "/integration-admins"}
              showDot={hasPendingIntegrationAdminRequest}
            >
              <Cable className="size-4" />
              Integration Admins
            </NavLink>
          )}
          {(role === UserRole.INTEGRATION_ADMIN ||
            role === UserRole.SUPER_ADMIN) && (
            <NavLink
              href="/module-endpoints"
              active={pathname === "/module-endpoints"}
            >
              <Network className="size-4" />
              Module endpoints
            </NavLink>
          )}
        </div>

        {launchable.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="px-2 text-xs font-medium tracking-wider text-muted-foreground">
              MODULES
            </p>
            {launchable.map((m) => (
              <button
                key={m.moduleName}
                type="button"
                onClick={() => launch(m.moduleName)}
                disabled={launching !== null}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground disabled:opacity-60"
              >
                <ExternalLink className="size-4" />
                {launching === m.moduleName ? "Opening..." : m.moduleName}
              </button>
            ))}
          </div>
        )}
      </nav>

      <Separator />

      <div className="flex flex-col gap-2 p-3">
        <div className="px-2">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <NavLink
          href="/change-password"
          active={pathname === "/change-password"}
        >
          <Settings className="size-4" />
          Settings
        </NavLink>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="size-4" />
          {loggingOut ? "Signing out..." : "Log out"}
        </Button>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  active,
  showDot = false,
  children,
}: {
  href: string;
  active: boolean;
  showDot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
      )}
    >
      {children}
      {showDot && (
        <>
          <span
            aria-hidden
            className="ml-auto size-1.5 rounded-full bg-red-500"
          />
          <span className="sr-only">Pending password change request</span>
        </>
      )}
    </Link>
  );
}
