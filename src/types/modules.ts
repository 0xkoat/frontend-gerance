// Mirrors backend/prisma/schema.prisma's ModuleName enum and TenantModule model — hand-
// matched, no shared types package (same "no shared types package" tradeoff as
// src/types/auth.ts). Re-verify against the schema if this ever looks stale.

export const ModuleName = {
  SIEM: "SIEM",
  SOAR: "SOAR",
  CTI: "CTI",
  EDR: "EDR",
  DFIR: "DFIR",
  VM: "VM",
} as const;

export type ModuleName = (typeof ModuleName)[keyof typeof ModuleName];

// A tenant's activation record for one module.
export interface TenantModule {
  id: string;
  tenantId: string;
  moduleName: ModuleName;
  isActive: boolean;
  config: Record<string, unknown> | null;
}
