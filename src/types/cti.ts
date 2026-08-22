export const CtiIocType = {
  IP: "IP",
  DOMAIN: "DOMAIN",
  URL: "URL",
  HASH: "HASH",
  EMAIL: "EMAIL",
} as const;

export type CtiIocType = (typeof CtiIocType)[keyof typeof CtiIocType];

// Mirrors the CtiIoc Prisma model. No status/assignee — CTI is the one module with neither
// (no CtiQueryFilters.status, no assign route), so there's nothing for AssignmentControl or
// StatusTransitionMenu to attach to here.
export interface CtiIoc {
  id: string;
  tenantId: string;
  type: CtiIocType;
  value: string;
  confidence: number;
  source: string;
  rawData: unknown | null;
  createdAt: string;
}
