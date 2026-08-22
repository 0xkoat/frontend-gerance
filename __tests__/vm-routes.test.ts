/**
 * @jest-environment node
 */
// Covers the remaining VM Route Handlers (see __tests__/vm-assets-route.test.ts for the
// asset list/create route): assets/[id], vulnerabilities, vulnerabilities/[id]/status,
// vulnerabilities/[id]/assign. Same next/headers cookie-store mocking strategy as
// __tests__/users-routes.test.ts.
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

describe("PATCH /api/vm/assets/[id]", () => {
  it("403s for a Viewer", async () => {
    setSession(viewerToken);
    const { PATCH } = await import("@/app/api/vm/assets/[id]/route");

    const res = await PATCH(req("PATCH", { name: "renamed" }), paramsOf("a1"));

    expect(res.status).toBe(403);
  });

  it("200s and forwards the update for an Analyst", async () => {
    setSession(analystToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse({ id: "a1", name: "renamed" }, 200) as Response,
      );
    const { PATCH } = await import("@/app/api/vm/assets/[id]/route");

    const res = await PATCH(req("PATCH", { name: "renamed" }), paramsOf("a1"));

    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/vm/assets/a1");
    expect(init?.method).toBe("PATCH");
  });
});

describe("DELETE /api/vm/assets/[id]", () => {
  it("surfaces a 409 (still-referenced asset) as { message }", async () => {
    setSession(adminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { statusCode: 409, message: "Asset still has vulnerabilities" },
          409,
        ) as Response,
      );
    const { DELETE } = await import("@/app/api/vm/assets/[id]/route");

    const res = await DELETE(req("DELETE"), paramsOf("a1"));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      message: "Asset still has vulnerabilities",
    });
  });
});

describe("GET /api/vm/vulnerabilities", () => {
  it("401s with no session", async () => {
    setSession(null);
    const { GET } = await import("@/app/api/vm/vulnerabilities/route");

    const res = await GET(req("GET"));

    expect(res.status).toBe(401);
  });

  it("is reachable by a Viewer and forwards the query string", async () => {
    setSession(viewerToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as Response);
    const { GET } = await import("@/app/api/vm/vulnerabilities/route");

    const res = await GET(
      new Request(
        "http://localhost:3001/api/vm/vulnerabilities?severity=CRITICAL&page=2",
      ),
    );

    expect(res.status).toBe(200);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("severity=CRITICAL");
    expect(String(url)).toContain("page=2");
  });
});

describe("PATCH /api/vm/vulnerabilities/[id]/status", () => {
  it("400s on an invalid status without calling the backend", async () => {
    setSession(adminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { PATCH } =
      await import("@/app/api/vm/vulnerabilities/[id]/status/route");

    const res = await PATCH(
      req("PATCH", { status: "NOT_A_STATUS" }),
      paramsOf("v1"),
    );

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("200s for a valid status change by an Analyst", async () => {
    setSession(analystToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse({ id: "v1", status: "REMEDIATED" }, 200) as Response,
      );
    const { PATCH } =
      await import("@/app/api/vm/vulnerabilities/[id]/status/route");

    const res = await PATCH(
      req("PATCH", { status: "REMEDIATED" }),
      paramsOf("v1"),
    );

    expect(res.status).toBe(200);
  });
});

describe("POST /api/vm/vulnerabilities/[id]/assign", () => {
  it("403s for a Viewer", async () => {
    setSession(viewerToken);
    const { POST } =
      await import("@/app/api/vm/vulnerabilities/[id]/assign/route");

    const res = await POST(
      req("POST", { assignedToUserId: "11111111-1111-4111-8111-111111111111" }),
      paramsOf("v1"),
    );

    expect(res.status).toBe(403);
  });

  it("200s and forwards the body", async () => {
    setSession(analystToken);
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          id: "v1",
          assignedToUserId: "11111111-1111-4111-8111-111111111111",
        },
        200,
      ) as Response,
    );
    const { POST } =
      await import("@/app/api/vm/vulnerabilities/[id]/assign/route");

    const res = await POST(
      req("POST", { assignedToUserId: "11111111-1111-4111-8111-111111111111" }),
      paramsOf("v1"),
    );

    expect(res.status).toBe(200);
    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      assignedToUserId: "11111111-1111-4111-8111-111111111111",
    });
  });
});

describe("DELETE /api/vm/vulnerabilities/[id]/assign", () => {
  it("200s with no body", async () => {
    setSession(adminToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({}, 200) as Response);
    const { DELETE } =
      await import("@/app/api/vm/vulnerabilities/[id]/assign/route");

    const res = await DELETE(req("DELETE"), paramsOf("v1"));

    expect(res.status).toBe(200);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.method).toBe("DELETE");
  });
});
