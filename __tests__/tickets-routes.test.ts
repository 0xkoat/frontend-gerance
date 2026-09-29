/**
 * @jest-environment node
 */
// Covers src/app/api/tickets/** and src/app/api/notifications/** (v2 Phase 4).
import { fakeToken, mockJsonResponse, setSessionCookie } from "../test-utils";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
  headers: jest.fn(async () => new Headers()),
}));
import { cookies } from "next/headers";

function setSession(token: string | null) {
  return setSessionCookie(cookies as jest.Mock, token);
}

const tokens = {
  analyst: fakeToken({
    sub: "analyst-1",
    role: "ANALYST",
    analystLevel: "L1",
    tenantId: "t1",
    mustChangePassword: false,
  }),
  integrationAdmin: fakeToken({
    sub: "ia-1",
    role: "INTEGRATION_ADMIN",
    tenantId: null,
    mustChangePassword: false,
  }),
  superAdmin: fakeToken({
    sub: "sa-1",
    role: "SUPER_ADMIN",
    tenantId: null,
    mustChangePassword: false,
  }),
};

function reqMethod(method: string, body?: unknown) {
  return new Request("http://localhost:3001/irrelevant", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const validTicket = {
  title: "SIEM unreachable",
  description: "The SIEM login page times out since this morning.",
  category: "MODULES",
  moduleName: "SIEM",
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("/api/tickets", () => {
  it("forwards a valid ticket from an Analyst", async () => {
    setSession(tokens.analyst);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse({ id: "t-1" }, 201) as unknown as Response,
      );
    const { POST } = await import("@/app/api/tickets/route");

    const res = await POST(reqMethod("POST", validTicket));

    expect(res.status).toBe(201);
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual(
      validTicket,
    );
  });

  it("400s a Modules ticket with no module without calling the backend", async () => {
    setSession(tokens.analyst);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { POST } = await import("@/app/api/tickets/route");

    const res = await POST(
      reqMethod("POST", { ...validTicket, moduleName: undefined }),
    );

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("lets the Integration Admin list but not create", async () => {
    setSession(tokens.integrationAdmin);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as unknown as Response);
    const { GET, POST } = await import("@/app/api/tickets/route");

    expect((await GET(reqMethod("GET"))).status).toBe(200);
    expect((await POST(reqMethod("POST", validTicket))).status).toBe(403);
  });

  it("keeps the Super Admin out", async () => {
    setSession(tokens.superAdmin);
    const { GET } = await import("@/app/api/tickets/route");

    expect((await GET(reqMethod("GET"))).status).toBe(403);
  });
});

describe("/api/notifications", () => {
  it("relays the caller's notifications and mark-read results", async () => {
    setSession(tokens.integrationAdmin);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse({ unreadCount: 0 }, 200) as unknown as Response,
      );
    const { POST } = await import("@/app/api/notifications/read-all/route");

    const res = await POST(reqMethod("POST"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ unreadCount: 0 });
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(
      /\/notifications\/read-all$/,
    );
  });
});
