// Unit tests for src/lib/asset-feed.ts — the source-aware "is this still open" logic and
// the per-source deep-link mapping the Phase 9 feed table/page rely on.
import { isOpenFeedEntry, hrefForFeedEntry } from "@/lib/asset-feed";
import { ModuleName, Severity } from "@/types/security";
import type { AssetFeedEntry } from "@/types/assets";

function entry(overrides: Partial<AssetFeedEntry>): AssetFeedEntry {
  return {
    id: "e1",
    tenantId: "t1",
    source: ModuleName.SIEM,
    type: "alert",
    severity: Severity.HIGH,
    status: "OPEN",
    assignedToUserId: null,
    timestamp: "2026-08-07T00:00:00.000Z",
    summary: "Test event",
    sourceId: "s1",
    createdAt: "2026-08-07T00:00:00.000Z",
    ...overrides,
  };
}

describe("isOpenFeedEntry", () => {
  it("is open when status is a non-terminal value for that source", () => {
    expect(
      isOpenFeedEntry(entry({ source: ModuleName.SIEM, status: "OPEN" })),
    ).toBe(true);
    expect(
      isOpenFeedEntry(entry({ source: ModuleName.SIEM, status: "ESCALATED" })),
    ).toBe(true);
  });

  it("is not open once the source's own status reaches its terminal value(s)", () => {
    expect(
      isOpenFeedEntry(entry({ source: ModuleName.SIEM, status: "RESOLVED" })),
    ).toBe(false);
    expect(
      isOpenFeedEntry(entry({ source: ModuleName.EDR, status: "RESOLVED" })),
    ).toBe(false);
    expect(
      isOpenFeedEntry(entry({ source: ModuleName.VM, status: "REMEDIATED" })),
    ).toBe(false);
    expect(
      isOpenFeedEntry(
        entry({ source: ModuleName.VM, status: "ACCEPTED_RISK" }),
      ),
    ).toBe(false);
    expect(
      isOpenFeedEntry(entry({ source: ModuleName.DFIR, status: "CONTAINED" })),
    ).toBe(false);
    expect(
      isOpenFeedEntry(entry({ source: ModuleName.DFIR, status: "RESOLVED" })),
    ).toBe(false);
  });

  it("VM's OPEN status (distinct from SIEM/EDR's terminal RESOLVED) is still open", () => {
    expect(
      isOpenFeedEntry(entry({ source: ModuleName.VM, status: "OPEN" })),
    ).toBe(true);
  });

  it("is never open when status is null (CTI/SOAR never set one)", () => {
    expect(
      isOpenFeedEntry(entry({ source: ModuleName.CTI, status: null })),
    ).toBe(false);
    expect(
      isOpenFeedEntry(entry({ source: ModuleName.SOAR, status: null })),
    ).toBe(false);
  });
});

describe("hrefForFeedEntry", () => {
  it("links DFIR rows to the real per-record detail route", () => {
    expect(
      hrefForFeedEntry(entry({ source: ModuleName.DFIR, sourceId: "inc-1" })),
    ).toBe("/dfir/inc-1");
  });

  it("links every other source to its owning module's list page", () => {
    expect(hrefForFeedEntry(entry({ source: ModuleName.SIEM }))).toBe("/siem");
    expect(hrefForFeedEntry(entry({ source: ModuleName.EDR }))).toBe("/edr");
    expect(hrefForFeedEntry(entry({ source: ModuleName.VM }))).toBe("/vm");
    expect(hrefForFeedEntry(entry({ source: ModuleName.CTI }))).toBe("/cti");
    expect(hrefForFeedEntry(entry({ source: ModuleName.SOAR }))).toBe("/soar");
  });
});
