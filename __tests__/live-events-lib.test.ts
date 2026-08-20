// Unit tests for src/lib/live-events.ts — the SSE frame classifier and the "new critical
// event" toast's summary/severity extraction. See the file's own comment on why the backend
// gives no explicit discriminator field for these frames.
import {
  classifyLiveEvent,
  describeCreatedEvent,
  severityOf,
} from "@/lib/live-events";

describe("classifyLiveEvent", () => {
  it("classifies the three *.created payload shapes", () => {
    // UnifiedEvent (EDR/SIEM/VM/CTI)
    expect(
      classifyLiveEvent({
        tenantId: "t1",
        source: "EDR",
        type: "detection",
        severity: "HIGH",
        data: {},
      }),
    ).toBe("created");
    // SoarExecutionPayload
    expect(
      classifyLiveEvent({
        tenantId: "t1",
        executionId: "e1",
        playbookName: "Contain host",
        severity: "MEDIUM",
      }),
    ).toBe("created");
    // DfirIncidentPayload
    expect(
      classifyLiveEvent({
        tenantId: "t1",
        incidentId: "i1",
        title: "Ransomware outbreak",
        severity: "CRITICAL",
      }),
    ).toBe("created");
  });

  it("classifies RecordAssignedPayload as 'assigned', checked before status", () => {
    expect(
      classifyLiveEvent({
        tenantId: "t1",
        source: "SIEM",
        recordId: "r1",
        assignedToUserId: "u1",
        status: "ASSIGNED",
      }),
    ).toBe("assigned");
  });

  it("classifies RecordStatusChangedPayload (and unassign, same shape) as 'status_or_unassigned'", () => {
    expect(
      classifyLiveEvent({
        tenantId: "t1",
        source: "SIEM",
        recordId: "r1",
        status: "ESCALATED",
      }),
    ).toBe("status_or_unassigned");
  });

  it("classifies RecordDeletedPayload (no status field at all) as 'deleted'", () => {
    expect(
      classifyLiveEvent({
        tenantId: "t1",
        source: "CTI",
        recordId: "r1",
      }),
    ).toBe("deleted");
  });

  it("returns 'unknown' for non-objects and unrecognized shapes", () => {
    expect(classifyLiveEvent(null)).toBe("unknown");
    expect(classifyLiveEvent("hello")).toBe("unknown");
    expect(classifyLiveEvent({ foo: "bar" })).toBe("unknown");
  });
});

describe("describeCreatedEvent", () => {
  it("prefers playbookName (SOAR)", () => {
    expect(describeCreatedEvent({ playbookName: "Contain host" })).toBe(
      'Playbook "Contain host" executed',
    );
  });

  it("prefers title (DFIR)", () => {
    expect(describeCreatedEvent({ title: "Ransomware outbreak" })).toBe(
      "Ransomware outbreak",
    );
  });

  it("builds an EDR-shaped summary from source + nested data", () => {
    expect(
      describeCreatedEvent({
        source: "EDR",
        data: { detectionName: "Suspicious PowerShell", hostname: "WKS-01" },
      }),
    ).toBe("Suspicious PowerShell on WKS-01");
  });

  it("builds a SIEM-shaped summary", () => {
    expect(
      describeCreatedEvent({ source: "SIEM", data: { title: "Brute force" } }),
    ).toBe("Brute force");
  });

  it("falls back to a generic label for an unrecognized shape", () => {
    expect(describeCreatedEvent({})).toBe("New security event");
  });
});

describe("severityOf", () => {
  it("reads a string severity field", () => {
    expect(severityOf({ severity: "CRITICAL" })).toBe("CRITICAL");
  });

  it("returns null when absent or not a string", () => {
    expect(severityOf({})).toBeNull();
    expect(severityOf({ severity: 5 })).toBeNull();
  });
});
