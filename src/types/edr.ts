import type { Severity } from "@/types/security";

export const EdrEndpointStatus = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  UNKNOWN: "UNKNOWN",
  DECOMMISSIONED: "DECOMMISSIONED",
} as const;

export type EdrEndpointStatus =
  (typeof EdrEndpointStatus)[keyof typeof EdrEndpointStatus];

// Mirrors the backend's UpdateEdrDetectionStatusDto: only these two of the four
// EdrDetectionStatus values are reachable via PATCH — OPEN/ASSIGNED are set by the backend
// itself (ingest/assign), never by a direct status-change request.
export const EDR_DETECTION_TRANSITIONABLE_STATUSES = [
  "ESCALATED",
  "RESOLVED",
] as const;

export const EdrDetectionStatus = {
  OPEN: "OPEN",
  ASSIGNED: "ASSIGNED",
  ESCALATED: "ESCALATED",
  RESOLVED: "RESOLVED",
} as const;

export type EdrDetectionStatus =
  (typeof EdrDetectionStatus)[keyof typeof EdrDetectionStatus];

// Mirrors the EdrEndpoint Prisma model. No manual create route on the backend — endpoints
// only ever appear via ingest()'s upsert (see CLAUDE.md's Phase 4 note).
export interface EdrEndpoint {
  id: string;
  tenantId: string;
  hostname: string;
  ip: string;
  os: string;
  status: EdrEndpointStatus;
  lastSeen: string;
}

// Mirrors the EdrDetection Prisma model. Flat shape — EdrService.query() never `include`s
// the related endpoint, so there's only `endpointId` here, not a nested `endpoint` object.
export interface EdrDetection {
  id: string;
  tenantId: string;
  endpointId: string;
  detectionName: string;
  description: string | null;
  mitreTechniques: string[];
  severity: Severity;
  status: EdrDetectionStatus;
  assignedToUserId: string | null;
  rawData: unknown | null;
  createdAt: string;
}
