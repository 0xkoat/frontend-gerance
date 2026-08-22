import { ModuleName } from "@/types/security";
import type { AssetFeedEntry } from "@/types/assets";

// AssetFeedEntry.status is a raw string copied verbatim from whichever module produced the
// row (see types/assets.ts's own comment) — every module has its own real status enum with
// its own terminal values (VM: REMEDIATED/ACCEPTED_RISK, DFIR: CONTAINED/RESOLVED, EDR/SIEM:
// RESOLVED), so "is this still open" has to be source-aware rather than one hardcoded set.
// CTI (no status concept at all, see Phase 6) and SOAR execution rows never get a `status`
// written by AssetService (see backend/src/asset/asset.service.ts's handlers) — both are
// absent from this map on purpose, not miscounted as open.
const TERMINAL_STATUS_BY_SOURCE: Partial<Record<ModuleName, string[]>> = {
  [ModuleName.SIEM]: ["RESOLVED"],
  [ModuleName.EDR]: ["RESOLVED"],
  [ModuleName.VM]: ["REMEDIATED", "ACCEPTED_RISK"],
  [ModuleName.DFIR]: ["CONTAINED", "RESOLVED"],
};

export function isOpenFeedEntry(entry: AssetFeedEntry): boolean {
  if (!entry.status) return false;
  const terminal = TERMINAL_STATUS_BY_SOURCE[entry.source];
  if (!terminal) return false;
  return !terminal.includes(entry.status);
}

// Per decision 8 of CLAUDE.md's adaptation plan, only DFIR has a real per-record detail
// route on the backend (GET /dfir/incidents/:id) — so DFIR is the only source that gets a
// genuine deep link to the specific record. Every other source links to its owning module's
// list page: a real, useful destination (the record is on that page, just not individually
// addressable), not an invented detail view the backend doesn't support.
export function hrefForFeedEntry(entry: AssetFeedEntry): string {
  switch (entry.source) {
    case ModuleName.DFIR:
      return `/dfir/${entry.sourceId}`;
    case ModuleName.SIEM:
      return "/siem";
    case ModuleName.EDR:
      return "/edr";
    case ModuleName.VM:
      return "/vm";
    case ModuleName.CTI:
      return "/cti";
    case ModuleName.SOAR:
      return "/soar";
  }
}
