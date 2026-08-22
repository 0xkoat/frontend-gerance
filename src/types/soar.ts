import type { Severity } from "@/types/security";

export const SoarExecutionStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export type SoarExecutionStatus =
  (typeof SoarExecutionStatus)[keyof typeof SoarExecutionStatus];

// Mirrors the backend's TriggerConditionDto — the only structured field
// CreateSoarPlaybookDto/UpdateSoarPlaybookDto accept for triggerCondition (a single
// Severity select, not a free-form JSON editor — see Phase 7 below).
export interface TriggerCondition {
  severity: Severity;
}

// Mirrors the SoarPlaybook Prisma model. `actions` stays a raw JSON object — the backend
// validates it as an open shape (SOAR execution is simulated, per decision 8 in
// backend/CLAUDE.md's module plan), so there's no structured type to give it here either.
export interface SoarPlaybook {
  id: string;
  tenantId: string;
  name: string;
  triggerCondition: TriggerCondition;
  actions: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

// Mirrors the SoarExecution Prisma model. No status-transition route exists for this module
// (SoarExecution is already terminal by the time a human sees it) — no
// SOAR_EXECUTION_TRANSITIONABLE_STATUSES constant, unlike siem.ts/edr.ts/dfir.ts.
export interface SoarExecution {
  id: string;
  tenantId: string;
  playbookId: string;
  alertId: string;
  status: SoarExecutionStatus;
  logs: string | null;
  createdAt: string;
}
