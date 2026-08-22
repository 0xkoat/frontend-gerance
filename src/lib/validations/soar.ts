import { z } from "zod";

// Mirrors backend/src/soar/dto/triggerCondition.dto.ts — evaluateTriggers only ever matches
// on severity, so this is the only field, a single Severity select on the frontend rather
// than a free-form condition builder.
export const triggerConditionSchema = z.object({
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

// `actions` stays a raw JSON object, matching the backend's own @IsObject() with no shape
// constraint — SOAR execution is simulated (see backend/CLAUDE.md's module plan, decision
// 8), there's no real action schema to build a structured form against. The page parses the
// textarea's raw text into JSON before handing it to this schema; a parse failure is caught
// there, not here.
const actionsSchema = z.record(z.string(), z.unknown());

// Mirrors backend/src/soar/dto/createSoarPlaybook.dto.ts
export const createSoarPlaybookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  triggerCondition: triggerConditionSchema,
  actions: actionsSchema,
});

// Mirrors backend/src/soar/dto/updateSoarPlaybook.dto.ts
export const updateSoarPlaybookSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  triggerCondition: triggerConditionSchema.optional(),
  actions: actionsSchema.optional(),
  isActive: z.boolean().optional(),
});
