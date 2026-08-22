// Mirrors backend/prisma/schema.prisma's enum blocks shared across every module — hand-
// matched, no shared types package (same "no shared types package" tradeoff as
// src/types/auth.ts). Re-verify against the schema if this ever looks stale (verified
// 2026-08-07 against a full read of backend/prisma/schema.prisma).
//
// Per-module enums and record types live in their own files under src/types/ (vm.ts,
// edr.ts, siem.ts, cti.ts, soar.ts, dfir.ts, assets.ts) rather than one giant file — see
// CLAUDE.md's adaptation plan, decision 4.

export const Severity = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;

export type Severity = (typeof Severity)[keyof typeof Severity];

export const ModuleName = {
  SIEM: "SIEM",
  SOAR: "SOAR",
  CTI: "CTI",
  EDR: "EDR",
  DFIR: "DFIR",
  VM: "VM",
} as const;

export type ModuleName = (typeof ModuleName)[keyof typeof ModuleName];

// Mirrors the TenantModule Prisma model — a tenant's activation record for one module.
// Consumed by Phase 11's tenant module activation UI (not built yet).
export interface TenantModule {
  id: string;
  tenantId: string;
  moduleName: ModuleName;
  isActive: boolean;
  config: Record<string, unknown> | null;
}

// Mirrors the backend's shared BaseQueryDto — the query params every module's GET list
// route accepts. See src/lib/query-filters.ts's buildQueryParams() for turning this into
// the URLSearchParams a Route Handler forwards to the backend.
export interface BaseQueryFilters {
  severity?: Severity;
  assignedToUserId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

// Mirrors the backend's shared AssignDto — the body every module's POST .../assign route
// accepts. An empty/omitted assignedToUserId is never sent by the frontend (Analysts only
// ever assign to themselves, Admins always pick a specific user) but the field stays
// optional here to match the backend's own DTO shape exactly.
export interface AssignPayload {
  assignedToUserId?: string;
}
