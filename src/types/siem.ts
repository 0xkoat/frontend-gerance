import type { Severity } from "@/types/security";

// Mirrors the backend's UpdateSiemAlertStatusDto: only these two of the four
// SiemAlertStatus values are reachable via PATCH — OPEN/ASSIGNED are set by the backend
// itself (ingest/assign), never by a direct status-change request.
export const SIEM_ALERT_TRANSITIONABLE_STATUSES = [
  "ESCALATED",
  "RESOLVED",
] as const;

export const SiemAlertStatus = {
  OPEN: "OPEN",
  ASSIGNED: "ASSIGNED",
  ESCALATED: "ESCALATED",
  RESOLVED: "RESOLVED",
} as const;

export type SiemAlertStatus =
  (typeof SiemAlertStatus)[keyof typeof SiemAlertStatus];

// Mirrors the SiemLog Prisma model — the raw pre-alert record. See CLAUDE.md's Phase 5 note
// on whether this needs its own list view at all.
export interface SiemLog {
  id: string;
  tenantId: string;
  source: string;
  eventType: string;
  severity: Severity;
  rawData: unknown | null;
  timestamp: string;
}

// Mirrors the SiemAlert Prisma model.
export interface SiemAlert {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  mitreTechniques: string[];
  severity: Severity;
  status: SiemAlertStatus;
  assignedToUserId: string | null;
  rawData: unknown | null;
  createdAt: string;
}
