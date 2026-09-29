/**
 * @jest-environment node
 */
// Covers src/app/api/module-endpoints/** and src/app/api/modules/** (v2 Phase 3).
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
  admin: fakeToken({
    sub: "admin-1",
    role: "ADMIN",
    tenantId: "t1",
    mustChangePassword: false,
  }),
  analyst: fakeToken({
    sub: "analyst-1",
    role: "ANALYST",
    analystLevel: "L1",
    tenantId: "t1",
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

function paramsOf(moduleName: string) {
  return { params: Promise.resolve({ moduleName }) };
}

const validEndpoint = {
  protocol: "HTTPS",
  host: "10.0.0.5",
  port: 5601,
  path: "/app/login",
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("/api/module-endpoints", () => {
  it("lets an Integration Admin save a valid endpoint, forwarding a numeric port", async () => {
    setSession(tokens.integrationAdmin);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({}, 200) as unknown as Response);
    const { PATCH } =
      await import("@/app/api/module-endpoints/[moduleName]/route");

    const res = await PATCH(
      reqMethod("PATCH", { ...validEndpoint, port: "5601" }),
      paramsOf("SIEM"),
    );

    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/module-endpoints\/SIEM$/);
    expect(JSON.parse(String(init?.body))).toEqual(validEndpoint);
  });

  it.each([
    ["a URL as the host", { host: "https://10.0.0.5" }],
    ["an out-of-range port", { port: 70000 }],
    ["a path without a leading slash", { path: "login" }],
  ])("400s %s without calling the backend", async (_label, override) => {
    setSession(tokens.integrationAdmin);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { PATCH } =
      await import("@/app/api/module-endpoints/[moduleName]/route");

    const res = await PATCH(
      reqMethod("PATCH", { ...validEndpoint, ...override }),
      paramsOf("SIEM"),
    );

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("lets a Super Admin read but not edit or test", async () => {
    setSession(tokens.superAdmin);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as unknown as Response);
    const { GET } = await import("@/app/api/module-endpoints/route");
    const { PATCH } =
      await import("@/app/api/module-endpoints/[moduleName]/route");
    const { POST: TEST } =
      await import("@/app/api/module-endpoints/[moduleName]/test/route");

    expect((await GET(reqMethod("GET"))).status).toBe(200);
    expect(
      (await PATCH(reqMethod("PATCH", validEndpoint), paramsOf("SIEM"))).status,
    ).toBe(403);
    expect((await TEST(reqMethod("POST"), paramsOf("SIEM"))).status).toBe(403);
  });

  it("keeps tenant roles out entirely", async () => {
    setSession(tokens.admin);
    const { GET } = await import("@/app/api/module-endpoints/route");

    expect((await GET(reqMethod("GET"))).status).toBe(403);
  });
});

describe("/api/modules", () => {
  it("launches for an Analyst and relays the URL", async () => {
    setSession(tokens.analyst);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { url: "https://10.0.0.5:5601/" },
          200,
        ) as unknown as Response,
      );
    const { POST } =
      await import("@/app/api/modules/[moduleName]/launch/route");

    const res = await POST(reqMethod("POST"), paramsOf("CTI"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://10.0.0.5:5601/" });
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(
      /\/modules\/CTI\/launch$/,
    );
  });

  it("relays the backend's level refusal", async () => {
    setSession(tokens.analyst);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          statusCode: 403,
          message: "SIEM requires analyst level L2 or higher",
        },
        403,
      ) as unknown as Response,
    );
    const { POST } =
      await import("@/app/api/modules/[moduleName]/launch/route");

    const res = await POST(reqMethod("POST"), paramsOf("SIEM"));

    expect(res.status).toBe(403);
    expect((await res.json()).message).toMatch(/requires analyst level L2/);
  });

  it("does not let platform-wide roles launch", async () => {
    setSession(tokens.integrationAdmin);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { POST } =
      await import("@/app/api/modules/[moduleName]/launch/route");

    const res = await POST(reqMethod("POST"), paramsOf("SIEM"));

    expect(res.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("lets only a tenant Admin change a level, and validates it", async () => {
    setSession(tokens.analyst);
    const { PATCH } =
      await import("@/app/api/modules/[moduleName]/level/route");
    expect(
      (
        await PATCH(
          reqMethod("PATCH", { minAnalystLevel: "L1" }),
          paramsOf("SIEM"),
        )
      ).status,
    ).toBe(403);

    setSession(tokens.admin);
    expect(
      (
        await PATCH(
          reqMethod("PATCH", { minAnalystLevel: "L9" }),
          paramsOf("SIEM"),
        )
      ).status,
    ).toBe(400);
  });
});
