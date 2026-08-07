import { z } from "zod";

// Mirrors backend/src/dfir/dto/updateDfirIncidentStatus.dto.ts — restricted to
// ESCALATED/CONTAINED/RESOLVED (see DFIR_INCIDENT_TRANSITIONABLE_STATUSES in
// src/types/dfir.ts), the shape the shared StatusTransitionMenu was built for.
export const updateDfirIncidentStatusSchema = z.object({
  status: z.enum(["ESCALATED", "CONTAINED", "RESOLVED"]),
});

// Mirrors backend/src/dfir/dto/createDfirLink.dto.ts. No id-typeahead/search endpoint
// exists to build anything friendlier against sourceId than a raw UUID input — a real
// limitation noted rather than over-built past what the backend supports (see CLAUDE.md's
// Phase 8 checklist).
export const createDfirLinkSchema = z.object({
  sourceType: z.enum([
    "SIEM_ALERT",
    "SIEM_LOG",
    "EDR_DETECTION",
    "VM_VULNERABILITY",
    "CTI_IOC",
    "SOAR_EXECUTION",
  ]),
  sourceId: z.uuid("Enter a valid UUID"),
});
