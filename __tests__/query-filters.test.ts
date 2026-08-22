import { buildQueryParams, hasNextPage } from "@/lib/query-filters";

describe("buildQueryParams", () => {
  it("produces an empty URLSearchParams for no filters", () => {
    expect(buildQueryParams({}).toString()).toBe("");
  });

  it("includes only the filters that are set", () => {
    const params = buildQueryParams({ severity: "CRITICAL", page: 2 });

    expect(params.get("severity")).toBe("CRITICAL");
    expect(params.get("page")).toBe("2");
    expect(params.has("assignedToUserId")).toBe(false);
    expect(params.has("dateFrom")).toBe(false);
  });

  it("serializes dates as ISO strings", () => {
    const dateFrom = new Date("2026-08-01T00:00:00.000Z");
    const params = buildQueryParams({ dateFrom });

    expect(params.get("dateFrom")).toBe("2026-08-01T00:00:00.000Z");
  });

  it("includes pageSize 0 and page 0 explicitly (only undefined is omitted)", () => {
    // page/pageSize are meaningful at 0 vs. simply absent — the `!== undefined` checks in
    // buildQueryParams are deliberate, not `if (filters.page)` which would drop a literal 0.
    const params = buildQueryParams({ page: 0, pageSize: 0 });

    expect(params.get("page")).toBe("0");
    expect(params.get("pageSize")).toBe("0");
  });
});

describe("hasNextPage", () => {
  it("is true when the page came back full", () => {
    expect(hasNextPage(20, 20)).toBe(true);
  });

  it("is false when the page came back short", () => {
    expect(hasNextPage(5, 20)).toBe(false);
  });

  it("is false for an empty page", () => {
    expect(hasNextPage(0, 20)).toBe(false);
  });
});
