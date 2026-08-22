import { z } from "zod";

// Mirrors backend/src/edr/dto/updateEdrEndpoint.dto.ts — every field optional. No
// create-endpoint schema exists on purpose: there's no manual create route, endpoints only
// ever appear via ingest()'s upsert (see CLAUDE.md's Phase 4 note).
export const updateEdrEndpointSchema = z.object({
  hostname: z.string().min(1, "Hostname is required").optional(),
  ip: z
    .union([z.ipv4(), z.ipv6()], { error: "Enter a valid IP address" })
    .optional(),
  os: z.string().min(1, "OS is required").optional(),
  status: z.enum(["ONLINE", "OFFLINE", "UNKNOWN", "DECOMMISSIONED"]).optional(),
});

// Mirrors backend/src/edr/dto/updateEdrDetectionStatus.dto.ts — restricted to
// ESCALATED/RESOLVED (see EDR_DETECTION_TRANSITIONABLE_STATUSES in src/types/edr.ts), which
// is why EDR detections use the shared StatusTransitionMenu, unlike VM's full-enum status.
export const updateEdrDetectionStatusSchema = z.object({
  status: z.enum(["ESCALATED", "RESOLVED"]),
});
