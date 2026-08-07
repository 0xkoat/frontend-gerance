import { z } from "zod";

// Mirrors backend/src/vm/dto/createVmAsset.dto.ts — @IsIP() with no version arg accepts
// both v4 and v6, hence the union (zod v4 has no combined "any IP" primitive).
export const createVmAssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ip: z.union([z.ipv4(), z.ipv6()], { error: "Enter a valid IP address" }),
  type: z.string().min(1, "Type is required"),
});

// Mirrors backend/src/vm/dto/updateVmAsset.dto.ts — every field optional, same validators.
export const updateVmAssetSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  ip: z
    .union([z.ipv4(), z.ipv6()], { error: "Enter a valid IP address" })
    .optional(),
  type: z.string().min(1, "Type is required").optional(),
});
