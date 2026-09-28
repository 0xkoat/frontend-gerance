// Mirrors backend/prisma/schema.prisma's ModuleName, ModuleProtocol, TenantModule,
// ModuleEndpoint and ModuleLaunch — hand-matched, no shared types package (same tradeoff as
// src/types/auth.ts). Re-verify against the schema if this ever looks stale.
import type { AnalystLevel, UserRole } from "@/types/auth";

export const ModuleName = {
  SIEM: "SIEM",
  SOAR: "SOAR",
  CTI: "CTI",
  EDR: "EDR",
  DFIR: "DFIR",
  VM: "VM",
} as const;

export type ModuleName = (typeof ModuleName)[keyof typeof ModuleName];

// A tenant's subscription to one module (Super Admin toggles it) plus the minimum analyst
// level that may launch it in that tenant (the tenant's own Admin sets it).
export interface TenantModule {
  id: string;
  tenantId: string;
  moduleName: ModuleName;
  isActive: boolean;
  minAnalystLevel: AnalystLevel;
}

export const ModuleProtocol = {
  HTTP: "HTTP",
  HTTPS: "HTTPS",
} as const;

export type ModuleProtocol =
  (typeof ModuleProtocol)[keyof typeof ModuleProtocol];

// Platform-wide location of a module's single instance. host/port are null until an
// Integration Admin configures them.
export interface ModuleEndpoint {
  moduleName: ModuleName;
  protocol: ModuleProtocol;
  host: string | null;
  port: number | null;
  path: string;
  updatedAt: string;
  updatedById: string | null;
}

// GET /modules row: what the current tenant user may see and launch.
export interface AvailableModule {
  moduleName: ModuleName;
  minAnalystLevel: AnalystLevel;
  configured: boolean;
  canLaunch: boolean;
}

export interface ModuleLaunch {
  id: string;
  userId: string;
  userEmail: string;
  role: UserRole;
  tenantId: string;
  moduleName: ModuleName;
  targetUrl: string;
  launchedAt: string;
}

// POST /module-endpoints/:name/test result.
export interface ConnectionTestResult {
  reachable: boolean;
  latencyMs?: number;
  error?: string;
}
