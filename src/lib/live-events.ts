import { ModuleName } from "@/types/security";
import type { Severity } from "@/types/security";

// Raw payload shapes the backend's SSE stream (GET /events/stream) can emit — mirrored from
// backend/src/common/security-module/types.ts. NestJS's @Sse endpoint wraps each one as
// `{ data: event }` with no `event:`/`type` field set on the MessageEvent (see
// backend/src/events/events.service.ts's own `map((event) => ({ data: event }))`), so
// EventSource always delivers these through its default `onmessage`, never a named-event
// listener — the frontend has to tell frames apart by which fields are present, not by a
// discriminator the backend never sends. `classifyLiveEvent` is that discriminator,
// verified against every event payload type the backend actually emits (re-verify against
// that file if it changes).
export type LiveEventKind =
  "created" | "assigned" | "status_or_unassigned" | "deleted" | "unknown";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function classifyLiveEvent(raw: unknown): LiveEventKind {
  if (!isRecord(raw)) return "unknown";

  // RecordAssignedPayload is the only shape with a non-null assignedToUserId — check it
  // first, since it also has `recordId` + `status` and would otherwise match the next
  // branch below.
  if (typeof raw.assignedToUserId === "string") return "assigned";

  if ("recordId" in raw) {
    // RecordStatusChangedPayload and the payload every module's *.unassigned handler
    // receives (see backend/src/asset/asset.service.ts's own comment: "one handler per
    // module for each of the two update event shapes") are the *same* shape on the wire —
    // the backend gives the frontend no field to tell "status changed on its own" apart
    // from "this was an unassign". Only RecordDeletedPayload (no `status` field at all) is
    // distinguishable from the two.
    return "status" in raw ? "status_or_unassigned" : "deleted";
  }

  // The three *.created payload shapes (UnifiedEvent, SoarExecutionPayload,
  // DfirIncidentPayload) all carry `severity` at the top level and none of the fields above.
  if ("severity" in raw) return "created";

  return "unknown";
}

// Best-effort human label for a *.created event, used only for the "new critical event"
// toast — mirrors backend/src/asset/asset.service.ts's own per-source summary strings by
// hand (same tradeoff as every other hand-mirrored shape in this codebase, see root
// CLAUDE.md's API contract note; re-verify if those change).
export function describeCreatedEvent(raw: Record<string, unknown>): string {
  if (typeof raw.playbookName === "string") {
    return `Playbook "${raw.playbookName}" executed`;
  }
  if (typeof raw.title === "string") {
    return raw.title;
  }
  if (typeof raw.source === "string" && isRecord(raw.data)) {
    const data = raw.data;
    switch (raw.source) {
      case ModuleName.EDR:
        return `${typeof data.detectionName === "string" ? data.detectionName : "Detection"} on ${typeof data.hostname === "string" ? data.hostname : "unknown host"}`;
      case ModuleName.SIEM:
        return typeof data.title === "string" ? data.title : "New SIEM alert";
      case ModuleName.VM:
        return typeof data.description === "string"
          ? data.description
          : "New vulnerability";
      case ModuleName.CTI:
        return `${typeof data.type === "string" ? data.type : "IOC"}: ${typeof data.value === "string" ? data.value : ""}`;
      default:
        break;
    }
  }
  return "New security event";
}

export function severityOf(raw: Record<string, unknown>): Severity | null {
  return typeof raw.severity === "string" ? (raw.severity as Severity) : null;
}
