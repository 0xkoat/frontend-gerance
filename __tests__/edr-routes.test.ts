/**
 * @jest-environment node
 */
// Covers every EDR Route Handler (Phase 4): endpoints, endpoints/[id], detections,
// detections/[id]/status, detections/[id]/assign. Same next/headers cookie-store mocking
// strategy as __tests__/users-routes.test.ts / __tests__/vm-routes.test.ts.
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

describe("GET /api/edr/endpoints", () => {
  it("401s with no session", async () => {
    setSession(null);
    const { GET } = await import("@/app/api/edr/endpoints/route");

    const res = await GET(req("GET"));

    expect(res.status).toBe(401);
  });

  it("is reachable by a Viewer", async () => {
    setSession(viewerToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as Response);
    const { GET } = await import("@/app/api/edr/endpoints/route");

    const res = await GET(req("GET"));

    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/edr/endpoints/[id]", () => {
  it("403s for a Viewer", async () => {
    setSession(viewerToken);
    const { PATCH } = await import("@/app/api/edr/endpoints/[id]/route");

    const res = await PATCH(
      req("PATCH", { hostname: "renamed" }),
      paramsOf("e1"),
    );

    expect(res.status).toBe(403);
  });

  it("200s for a valid update by an Analyst", async () => {
    setSession(analystToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse({ id: "e1", hostname: "renamed" }, 200) as Response,
      );
    const { PATCH } = await import("@/app/api/edr/endpoints/[id]/route");

    const res = await PATCH(
      req("PATCH", { hostname: "renamed" }),
      paramsOf("e1"),
    );

    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/edr/endpoints/e1");
    expect(init?.method).toBe("PATCH");
  });
});

describe("DELETE /api/edr/endpoints/[id]", () => {
  it("surfaces the backend's DECOMMISSIONED-pointing 409 message as-is", async () => {
    setSession(adminToken);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          statusCode: 409,
          message:
            "Cannot delete an endpoint that has existing detections — mark it DECOMMISSIONED instead (PATCH with status)",
        },
        409,
      ) as Response,
    );
    const { DELETE } = await import("@/app/api/edr/endpoints/[id]/route");

    const res = await DELETE(req("DELETE"), paramsOf("e1"));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/DECOMMISSIONED/);
  });
});

describe("GET /api/edr/detections", () => {
  it("forwards the query string, no status param (unsupported by EdrQueryDto)", async () => {
    setSession(viewerToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as Response);
    const { GET } = await import("@/app/api/edr/detections/route");

    const res = await GET(
      new Request(
        "http://localhost:3001/api/edr/detections?severity=HIGH&page=1",
      ),
    );

    expect(res.status).toBe(200);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("severity=HIGH");
  });
});

describe("PATCH /api/edr/detections/[id]/status", () => {
  it("400s on a status outside the restricted transition set", async () => {
    setSession(adminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { PATCH } =
      await import("@/app/api/edr/detections/[id]/status/route");

    // OPEN is a real EdrDetectionStatus value, but not reachable via this route (only
    // ESCALATED/RESOLVED are, matching UpdateEdrDetectionStatusDto's @IsIn(...)).
    const res = await PATCH(req("PATCH", { status: "OPEN" }), paramsOf("d1"));

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("200s for a valid transition", async () => {
    setSession(analystToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse({ id: "d1", status: "RESOLVED" }, 200) as Response,
      );
    const { PATCH } =
      await import("@/app/api/edr/detections/[id]/status/route");

    const res = await PATCH(
      req("PATCH", { status: "RESOLVED" }),
      paramsOf("d1"),
    );

    expect(res.status).toBe(200);
  });
});

describe("POST /api/edr/detections/[id]/assign", () => {
  it("403s for a Viewer", async () => {
    setSession(viewerToken);
    const { POST } = await import("@/app/api/edr/detections/[id]/assign/route");

    const res = await POST(
      req("POST", { assignedToUserId: "11111111-1111-4111-8111-111111111111" }),
      paramsOf("d1"),
    );

    expect(res.status).toBe(403);
  });

  it("surfaces a 409 (already-resolved) as { message }", async () => {
    setSession(analystToken);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          statusCode: 409,
          message: "Detection is already resolved and cannot be reassigned",
        },
        409,
      ) as Response,
    );
    const { POST } = await import("@/app/api/edr/detections/[id]/assign/route");

    const res = await POST(
      req("POST", { assignedToUserId: "11111111-1111-4111-8111-111111111111" }),
      paramsOf("d1"),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      message: "Detection is already resolved and cannot be reassigned",
    });
  });
});

describe("DELETE /api/edr/detections/[id]/assign", () => {
  it("200s with no body", async () => {
    setSession(adminToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({}, 200) as Response);
    const { DELETE } =
      await import("@/app/api/edr/detections/[id]/assign/route");

    const res = await DELETE(req("DELETE"), paramsOf("d1"));

    expect(res.status).toBe(200);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.method).toBe("DELETE");
  });
});
