/**
 * @jest-environment node
 */
// First proxyToBackend()-backed route (src/lib/proxy-route.ts) — proves the shared helper's
// shape against a real route before ~35 more reuse it across the other five modules (Phases
// 4-8). Same next/headers cookie-store mocking strategy as __tests__/users-routes.test.ts.
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

function getReq(url = "http://localhost:3001/api/vm/assets") {
  return new Request(url);
}

function postReq(body: unknown) {
  return new Request("http://localhost:3001/api/vm/assets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /api/vm/assets", () => {
  it("401s with no session", async () => {
    setSession(null);
    const { GET } = await import("@/app/api/vm/assets/route");

    const res = await GET(getReq());

    expect(res.status).toBe(401);
  });

  it("is reachable by a Viewer session (read-only, not blocked)", async () => {
    setSession(viewerToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([{ id: "a1" }], 200) as Response);
    const { GET } = await import("@/app/api/vm/assets/route");

    const res = await GET(getReq());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "a1" }]);
  });

  it("normalizes a backend error into { message }", async () => {
    setSession(adminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse({ statusCode: 500, message: "Boom" }, 500) as Response,
      );
    const { GET } = await import("@/app/api/vm/assets/route");

    const res = await GET(getReq());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Boom" });
  });
});

describe("POST /api/vm/assets", () => {
  it("401s with no session", async () => {
    setSession(null);
    const { POST } = await import("@/app/api/vm/assets/route");

    const res = await POST(postReq({}));

    expect(res.status).toBe(401);
  });

  it("403s for a Viewer session", async () => {
    setSession(viewerToken);
    const { POST } = await import("@/app/api/vm/assets/route");

    const res = await POST(
      postReq({ name: "web-1", ip: "10.0.0.5", type: "server" }),
    );

    expect(res.status).toBe(403);
  });

  it("400s on an invalid body without calling the backend", async () => {
    setSession(adminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { POST } = await import("@/app/api/vm/assets/route");

    const res = await POST(
      postReq({ name: "", ip: "not-an-ip", type: "server" }),
    );

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("201s and forwards a valid body for an Analyst session", async () => {
    setSession(analystToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse({ id: "a2", name: "web-1" }, 201) as Response,
      );
    const { POST } = await import("@/app/api/vm/assets/route");

    const res = await POST(
      postReq({ name: "web-1", ip: "10.0.0.5", type: "server" }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "a2", name: "web-1" });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/vm/assets");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      name: "web-1",
      ip: "10.0.0.5",
      type: "server",
    });
  });
});
