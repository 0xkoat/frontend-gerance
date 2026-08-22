import { z } from "zod";

// Mirrors backend/src/cti/dto/createCtiIoc.dto.ts
export const createCtiIocSchema = z.object({
  type: z.enum(["IP", "DOMAIN", "URL", "HASH", "EMAIL"]),
  value: z.string().min(1, "Value is required"),
  confidence: z.coerce
    .number()
    .int("Must be a whole number")
    .min(0, "Must be at least 0")
    .max(100, "Must be at most 100"),
  source: z.string().min(1, "Source is required"),
});

// Mirrors backend/src/cti/dto/updateCtiIoc.dto.ts — type/value aren't editable here,
// together they're the IOC's identity (the unique key ingest() upserts on); changing either
// is really "delete this IOC, create a different one," not an update.
export const updateCtiIocSchema = z.object({
  confidence: z.coerce
    .number()
    .int("Must be a whole number")
    .min(0, "Must be at least 0")
    .max(100, "Must be at most 100")
    .optional(),
  source: z.string().min(1, "Source is required").optional(),
});
