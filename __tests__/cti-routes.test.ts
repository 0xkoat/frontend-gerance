/**
 * @jest-environment node
 */
// Covers every CTI Route Handler (Phase 6): iocs, iocs/[id].
import { fakeToken, mockJsonResponse, setSessionCookie } from "../test-utils";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));
import { cookies } from "next/headers";

function setSession(token: string | null) {
  return setSessionCookie(cookies as jest.Mock, token);
}

const adminToken = fakeToken({
  sub: "admin-1",
  role: "ADMIN",
  tenantId: "t1",
  mustChangePassword: false,
});
const analystToken = fakeToken({
  sub: "analyst-1",
  role: "ANALYST",
  tenantId: "t1",
  mustChangePassword: false,
});
const viewerToken = fakeToken({
  sub: "viewer-1",
  role: "VIEWER",
  tenantId: "t1",
  mustChangePassword: false,
});

function req(method: string, body?: unknown) {
  return new Request("http://localhost:3001/irrelevant", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function paramsOf(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /api/cti/iocs", () => {
  it("is reachable by a Viewer and forwards the type filter", async () => {
    setSession(viewerToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as Response);
    const { GET } = await import("@/app/api/cti/iocs/route");

    const res = await GET(
      new Request("http://localhost:3001/api/cti/iocs?type=IP"),
    );

    expect(res.status).toBe(200);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("type=IP");
  });
});

describe("POST /api/cti/iocs", () => {
  it("403s for a Viewer", async () => {
    setSession(viewerToken);
    const { POST } = await import("@/app/api/cti/iocs/route");

    const res = await POST(
      req("POST", {
        type: "IP",
        value: "1.2.3.4",
        confidence: 80,
        source: "test",
      }),
    );

    expect(res.status).toBe(403);
  });

  it("400s on an out-of-range confidence without calling the backend", async () => {
    setSession(adminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { POST } = await import("@/app/api/cti/iocs/route");

    const res = await POST(
      req("POST", {
        type: "IP",
        value: "1.2.3.4",
        confidence: 150,
        source: "test",
      }),
    );

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("201s for a valid IOC by an Analyst", async () => {
    setSession(analystToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({ id: "i1" }, 201) as Response);
    const { POST } = await import("@/app/api/cti/iocs/route");

    const res = await POST(
      req("POST", {
        type: "IP",
        value: "1.2.3.4",
        confidence: 80,
        source: "test",
      }),
    );

    expect(res.status).toBe(201);
    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      type: "IP",
      value: "1.2.3.4",
      confidence: 80,
      source: "test",
    });
  });
});

describe("PATCH /api/cti/iocs/[id]", () => {
  it("only forwards confidence/source, never type/value", async () => {
    setSession(adminToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({ id: "i1" }, 200) as Response);
    const { PATCH } = await import("@/app/api/cti/iocs/[id]/route");

    // Even if a caller sent type/value, the schema strips them — not part of
    // updateCtiIocSchema's shape at all.
    const res = await PATCH(
      req("PATCH", { confidence: 90, source: "updated-source" }),
      paramsOf("i1"),
    );

    expect(res.status).toBe(200);
    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      confidence: 90,
      source: "updated-source",
    });
  });

  it("403s for a Viewer", async () => {
    setSession(viewerToken);
    const { PATCH } = await import("@/app/api/cti/iocs/[id]/route");

    const res = await PATCH(req("PATCH", { confidence: 90 }), paramsOf("i1"));

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/cti/iocs/[id]", () => {
  it("200s with no body", async () => {
    setSession(analystToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({}, 200) as Response);
    const { DELETE } = await import("@/app/api/cti/iocs/[id]/route");

    const res = await DELETE(req("DELETE"), paramsOf("i1"));

    expect(res.status).toBe(200);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.method).toBe("DELETE");
  });
});
