"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MODULES } from "@/lib/nav";
import { UserRole } from "@/types/auth";

interface SidebarNavProps {
  role: UserRole;
  displayName: string;
  subtitle: string;
  hasPendingPasswordRequest?: boolean;
}

export function SidebarNav({
  role,
  displayName,
  subtitle,
  hasPendingPasswordRequest = false,
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isTenantScoped = role !== UserRole.SUPER_ADMIN;

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#6c63ff] text-sm font-bold text-white">
          S
        </span>
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
        </div>

        {isTenantScoped && (
          <div className="flex flex-col gap-1">
            <p className="px-2 text-xs font-medium tracking-wider text-muted-foreground">
              MODULES
            </p>
            {MODULES.map((m) => (
              <NavLink
                key={m.slug}
                href={`/${m.slug}`}
                active={pathname === `/${m.slug}`}
              >
                {m.label}
              </NavLink>
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
