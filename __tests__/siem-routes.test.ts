/**
 * @jest-environment node
 */
// Covers every SIEM Route Handler (Phase 5): logs, alerts, alerts/[id]/status,
// alerts/[id]/assign. Same next/headers cookie-store mocking strategy as
// __tests__/vm-routes.test.ts / __tests__/edr-routes.test.ts.
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

describe("GET /api/siem/logs", () => {
  it("401s with no session", async () => {
    setSession(null);
    const { GET } = await import("@/app/api/siem/logs/route");

    const res = await GET(req("GET"));

    expect(res.status).toBe(401);
  });

  it("is reachable by a Viewer", async () => {
    setSession(viewerToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as Response);
    const { GET } = await import("@/app/api/siem/logs/route");

    const res = await GET(req("GET"));

    expect(res.status).toBe(200);
  });
});

describe("GET /api/siem/alerts", () => {
  it("forwards severity/status/page filters", async () => {
    setSession(viewerToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as Response);
    const { GET } = await import("@/app/api/siem/alerts/route");

    const res = await GET(
      new Request(
        "http://localhost:3001/api/siem/alerts?severity=CRITICAL&status=OPEN&page=2",
      ),
    );

    expect(res.status).toBe(200);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("severity=CRITICAL");
    expect(String(url)).toContain("status=OPEN");
    expect(String(url)).toContain("page=2");
  });
});

describe("PATCH /api/siem/alerts/[id]/status", () => {
  it("400s on a status outside the restricted transition set", async () => {
    setSession(adminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { PATCH } = await import("@/app/api/siem/alerts/[id]/status/route");

    const res = await PATCH(
      req("PATCH", { status: "ASSIGNED" }),
      paramsOf("a1"),
    );

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("403s for a Viewer", async () => {
    setSession(viewerToken);
    const { PATCH } = await import("@/app/api/siem/alerts/[id]/status/route");

    const res = await PATCH(
      req("PATCH", { status: "RESOLVED" }),
      paramsOf("a1"),
    );

    expect(res.status).toBe(403);
  });

  it("200s for a valid transition by an Analyst", async () => {
    setSession(analystToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse({ id: "a1", status: "ESCALATED" }, 200) as Response,
      );
    const { PATCH } = await import("@/app/api/siem/alerts/[id]/status/route");

    const res = await PATCH(
      req("PATCH", { status: "ESCALATED" }),
      paramsOf("a1"),
    );

    expect(res.status).toBe(200);
  });
});

describe("POST /api/siem/alerts/[id]/assign", () => {
  it("surfaces a 409 (already-resolved) as { message }", async () => {
    setSession(analystToken);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          statusCode: 409,
          message: "Alert is already resolved and cannot be reassigned",
        },
        409,
      ) as Response,
    );
    const { POST } = await import("@/app/api/siem/alerts/[id]/assign/route");

    const res = await POST(
      req("POST", { assignedToUserId: "11111111-1111-4111-8111-111111111111" }),
      paramsOf("a1"),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      message: "Alert is already resolved and cannot be reassigned",
    });
  });
});

describe("DELETE /api/siem/alerts/[id]/assign", () => {
  it("403s for a Viewer", async () => {
    setSession(viewerToken);
    const { DELETE } = await import("@/app/api/siem/alerts/[id]/assign/route");

    const res = await DELETE(req("DELETE"), paramsOf("a1"));

    expect(res.status).toBe(403);
  });

  it("200s with no body for an Admin", async () => {
    setSession(adminToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({}, 200) as Response);
    const { DELETE } = await import("@/app/api/siem/alerts/[id]/assign/route");

    const res = await DELETE(req("DELETE"), paramsOf("a1"));

    expect(res.status).toBe(200);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.method).toBe("DELETE");
  });
});
