import { z } from "zod";

// Mirrors backend/src/siem/dto/updateSiemAlertStatus.dto.ts — restricted to
// ESCALATED/RESOLVED (see SIEM_ALERT_TRANSITIONABLE_STATUSES in src/types/siem.ts), the
// shape the shared StatusTransitionMenu was built for. No create schema: alerts and logs
// both only ever appear via ingest(), same as EDR's endpoints.
export const updateSiemAlertStatusSchema = z.object({
  status: z.enum(["ESCALATED", "RESOLVED"]),
});
