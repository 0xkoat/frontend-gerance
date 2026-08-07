import type { Severity } from "@/types/security";

// Mirrors the backend's UpdateDfirIncidentStatusDto: only these three of the five
// DfirIncidentStatus values are reachable via PATCH — OPEN/INVESTIGATING are set by the
// backend itself, never by a direct status-change request.
export const DFIR_INCIDENT_TRANSITIONABLE_STATUSES = [
  "ESCALATED",
  "CONTAINED",
  "RESOLVED",
] as const;

export const DfirIncidentStatus = {
  OPEN: "OPEN",
  INVESTIGATING: "INVESTIGATING",
  ESCALATED: "ESCALATED",
  CONTAINED: "CONTAINED",
  RESOLVED: "RESOLVED",
} as const;

export type DfirIncidentStatus =
  (typeof DfirIncidentStatus)[keyof typeof DfirIncidentStatus];

export const DfirLinkSourceType = {
  SIEM_ALERT: "SIEM_ALERT",
  SIEM_LOG: "SIEM_LOG",
  EDR_DETECTION: "EDR_DETECTION",
  VM_VULNERABILITY: "VM_VULNERABILITY",
  CTI_IOC: "CTI_IOC",
  SOAR_EXECUTION: "SOAR_EXECUTION",
} as const;

export type DfirLinkSourceType =
  (typeof DfirLinkSourceType)[keyof typeof DfirLinkSourceType];

// Mirrors the DfirIncident Prisma model.
export interface DfirIncident {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  mitreTechniques: string[];
  severity: Severity;
  status: DfirIncidentStatus;
  assignedToUserId: string | null;
  createdAt: string;
}

// Mirrors the DfirLink Prisma model — a polymorphic pointer from an incident back to
// whatever record across another module led to it.
export interface DfirLink {
  id: string;
  tenantId: string;
  incidentId: string;
  sourceType: DfirLinkSourceType;
  sourceId: string;
}

// GET /dfir/incidents/:id's response shape (DfirService.getIncidentDetail returns
// `DfirIncident & { links: DfirLink[] }`) — the one module with a real detail endpoint (see
// decision 8 in CLAUDE.md's adaptation plan), consumed by Phase 8's incident detail page.
export interface DfirIncidentDetail extends DfirIncident {
  links: DfirLink[];
}
