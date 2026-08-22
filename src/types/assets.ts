import type { ModuleName, Severity } from "@/types/security";

// Mirrors the AssetFeedEntry Prisma model — a materialized cross-module feed row, populated
// by AssetService's event listeners. `status` is a bare string (not one of the typed status
// enums in vm.ts/edr.ts/siem.ts/dfir.ts) because it's copied verbatim from whichever module
// produced the entry, each with its own status shape — the feed doesn't normalize them into
// one enum.
export interface AssetFeedEntry {
  id: string;
  tenantId: string;
  source: ModuleName;
  type: string;
  severity: Severity;
  status: string | null;
  assignedToUserId: string | null;
  timestamp: string;
  summary: string;
  sourceId: string;
  createdAt: string;
}
