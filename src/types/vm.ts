import type { Severity } from "@/types/security";

// Mirrors backend/prisma/schema.prisma's VmVulnerabilitiesStatus enum (name kept exactly
// as-is, plural included, for greppability against the schema).
export const VmVulnerabilitiesStatus = {
  OPEN: "OPEN",
  REMEDIATED: "REMEDIATED",
  ACCEPTED_RISK: "ACCEPTED_RISK",
} as const;

export type VmVulnerabilitiesStatus =
  (typeof VmVulnerabilitiesStatus)[keyof typeof VmVulnerabilitiesStatus];

// Mirrors the VmAsset Prisma model. No status/assignee — VM's assignable, statusable record
// is VmVulnerability below; an asset is just the thing a vulnerability was found on.
export interface VmAsset {
  id: string;
  tenantId: string;
  name: string;
  ip: string;
  type: string;
  createdAt: string;
}

// Mirrors the VmVulnerability Prisma model. Flat shape — VmService.query() never `include`s
// the related asset, so there's no nested `asset` object here, just `assetId`.
export interface VmVulnerability {
  id: string;
  tenantId: string;
  assetId: string;
  severity: Severity;
  description: string;
  createdAt: string;
  cveId: string | null;
  status: VmVulnerabilitiesStatus;
  assignedToUserId: string | null;
  rawData: unknown | null;
}
