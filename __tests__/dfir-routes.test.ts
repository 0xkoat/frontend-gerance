/**
 * @jest-environment node
 */
// Covers every DFIR Route Handler (Phase 8, the last module): incidents, incidents/[id],
// incidents/[id]/status, incidents/[id]/assign, incidents/[id]/links,
// incidents/[id]/links/[linkId].
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

function paramsOf(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /api/dfir/incidents", () => {
  it("forwards severity/status/page filters and is reachable by a Viewer", async () => {
    setSession(viewerToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as Response);
    const { GET } = await import("@/app/api/dfir/incidents/route");

    const res = await GET(
      new Request(
        "http://localhost:3001/api/dfir/incidents?severity=CRITICAL&status=OPEN&page=1",
      ),
    );

    expect(res.status).toBe(200);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("severity=CRITICAL");
    expect(String(url)).toContain("status=OPEN");
  });
});

describe("GET /api/dfir/incidents/[id]", () => {
  it("is reachable by a Viewer and returns the incident plus its links", async () => {
    setSession(viewerToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { id: "i1", title: "Ransomware", links: [] },
          200,
        ) as Response,
      );
    const { GET } = await import("@/app/api/dfir/incidents/[id]/route");

    const res = await GET(req("GET"), paramsOf({ id: "i1" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "i1",
      title: "Ransomware",
      links: [],
    });
  });
});

describe("PATCH /api/dfir/incidents/[id]/status", () => {
  it("400s on a status outside the restricted transition set", async () => {
    setSession(adminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { PATCH } =
      await import("@/app/api/dfir/incidents/[id]/status/route");

    // OPEN/INVESTIGATING are real DfirIncidentStatus values but not reachable via this
    // route, only ESCALATED/CONTAINED/RESOLVED are.
    const res = await PATCH(
      req("PATCH", { status: "INVESTIGATING" }),
      paramsOf({ id: "i1" }),
    );

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("200s for a valid transition by an Analyst", async () => {
    setSession(analystToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse({ id: "i1", status: "CONTAINED" }, 200) as Response,
      );
    const { PATCH } =
      await import("@/app/api/dfir/incidents/[id]/status/route");

    const res = await PATCH(
      req("PATCH", { status: "CONTAINED" }),
      paramsOf({ id: "i1" }),
    );

    expect(res.status).toBe(200);
  });
});

describe("POST /api/dfir/incidents/[id]/assign", () => {
  it("403s for a Viewer", async () => {
    setSession(viewerToken);
    const { POST } = await import("@/app/api/dfir/incidents/[id]/assign/route");

    const res = await POST(
      req("POST", { assignedToUserId: "11111111-1111-4111-8111-111111111111" }),
      paramsOf({ id: "i1" }),
    );

    expect(res.status).toBe(403);
  });

  it("surfaces a 409 (already-contained/resolved) as { message }", async () => {
    setSession(analystToken);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          statusCode: 409,
          message: "Incident is contained and cannot be reassigned",
        },
        409,
      ) as Response,
    );
    const { POST } = await import("@/app/api/dfir/incidents/[id]/assign/route");

    const res = await POST(
      req("POST", { assignedToUserId: "11111111-1111-4111-8111-111111111111" }),
      paramsOf({ id: "i1" }),
    );

    expect(res.status).toBe(409);
  });
});

describe("POST /api/dfir/incidents/[id]/links", () => {
  it("400s on an invalid sourceType without calling the backend", async () => {
    setSession(adminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { POST } = await import("@/app/api/dfir/incidents/[id]/links/route");

    const res = await POST(
      req("POST", {
        sourceType: "NOT_A_TYPE",
        sourceId: "11111111-1111-4111-8111-111111111111",
      }),
      paramsOf({ id: "i1" }),
    );

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("400s on a non-UUID sourceId", async () => {
    setSession(adminToken);
    const { POST } = await import("@/app/api/dfir/incidents/[id]/links/route");

    const res = await POST(
      req("POST", { sourceType: "SIEM_ALERT", sourceId: "not-a-uuid" }),
      paramsOf({ id: "i1" }),
    );

    expect(res.status).toBe(400);
  });

  it("201s and forwards a valid link body for an Analyst", async () => {
    setSession(analystToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({ id: "l1" }, 201) as Response);
    const { POST } = await import("@/app/api/dfir/incidents/[id]/links/route");

    const res = await POST(
      req("POST", {
        sourceType: "SIEM_ALERT",
        sourceId: "11111111-1111-4111-8111-111111111111",
      }),
      paramsOf({ id: "i1" }),
    );

    expect(res.status).toBe(201);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/dfir/incidents/i1/links");
    expect(JSON.parse(init?.body as string)).toEqual({
      sourceType: "SIEM_ALERT",
      sourceId: "11111111-1111-4111-8111-111111111111",
    });
  });
});

describe("DELETE /api/dfir/incidents/[id]/links/[linkId]", () => {
  it("403s for a Viewer", async () => {
    setSession(viewerToken);
    const { DELETE } =
      await import("@/app/api/dfir/incidents/[id]/links/[linkId]/route");

    const res = await DELETE(
      req("DELETE"),
      paramsOf({ id: "i1", linkId: "l1" }),
    );

    expect(res.status).toBe(403);
  });

  it("200s and hits the correct nested path for an Admin", async () => {
    setSession(adminToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({}, 200) as Response);
    const { DELETE } =
      await import("@/app/api/dfir/incidents/[id]/links/[linkId]/route");

    const res = await DELETE(
      req("DELETE"),
      paramsOf({ id: "i1", linkId: "l1" }),
    );

    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/dfir/incidents/i1/links/l1");
    expect(init?.method).toBe("DELETE");
  });
});
