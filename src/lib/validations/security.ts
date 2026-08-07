import { z } from "zod";

// Mirrors the backend's shared AssignDto (common/dto/assign.dto.ts) — the body every
// module's POST .../assign route accepts. Shared across modules the same way the backend's
// own DTO is (see src/types/security.ts's AssignPayload).
export const assignPayloadSchema = z.object({
  assignedToUserId: z.uuid().optional(),
});
