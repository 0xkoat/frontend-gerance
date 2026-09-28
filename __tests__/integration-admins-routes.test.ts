/**
 * @jest-environment node
 */
// Covers src/app/api/integration-admins/** — same cookies()-mocking strategy as
// tenants-routes.test.ts.
import { fakeToken, mockJsonResponse, setSessionCookie } from "../test-utils";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));
import { cookies } from "next/headers";

function setSession(token: string | null) {
  return setSessionCookie(cookies as jest.Mock, token);
}

const superAdminToken = fakeToken({
  sub: "sa-1",
  role: "SUPER_ADMIN",
  tenantId: null,
  mustChangePassword: false,
});
const integrationAdminToken = fakeToken({
  sub: "ia-1",
  role: "INTEGRATION_ADMIN",
  tenantId: null,
  mustChangePassword: false,
});

function reqMethod(method: string, body?: unknown) {
  return new Request("http://localhost:3001/irrelevant", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function paramsOf(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validPerson = {
  name: "Integrator",
  email: "integrator@secops.test",
  password: "Str0ng!Pass",
  phoneNumber: "+21620000030",
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("/api/integration-admins", () => {
  it("403s every route for a non-Super-Admin, even another platform role", async () => {
    setSession(integrationAdminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { GET, POST } = await import("@/app/api/integration-admins/route");
    const { DELETE } = await import("@/app/api/integration-admins/[id]/route");
    const { POST: RESET } =
      await import("@/app/api/integration-admins/[id]/reset-password/route");

    expect((await GET(reqMethod("GET"))).status).toBe(403);
    expect((await POST(reqMethod("POST", validPerson))).status).toBe(403);
    expect((await DELETE(reqMethod("DELETE"), paramsOf("ia-2"))).status).toBe(
      403,
    );
    expect(
      (
        await RESET(
          reqMethod("POST", { newPassword: "New-password1!" }),
          paramsOf("ia-2"),
        )
      ).status,
    ).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards a valid create to POST /integration-admins", async () => {
    setSession(superAdminToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { id: "ia-2", name: "Integrator" },
          201,
        ) as unknown as Response,
      );
    const { POST } = await import("@/app/api/integration-admins/route");

    const res = await POST(reqMethod("POST", validPerson));

    expect(res.status).toBe(201);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/integration-admins$/);
    expect(JSON.parse(String(init?.body))).toEqual(validPerson);
  });

  it("400s an invalid create without calling the backend", async () => {
    setSession(superAdminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { POST } = await import("@/app/api/integration-admins/route");

    const res = await POST(reqMethod("POST", { ...validPerson, email: "x" }));

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards delete and reset-password to the matching backend paths", async () => {
    setSession(superAdminToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse({ message: "ok" }, 200) as unknown as Response,
      );
    const { DELETE } = await import("@/app/api/integration-admins/[id]/route");
    const { POST: RESET } =
      await import("@/app/api/integration-admins/[id]/reset-password/route");

    await DELETE(reqMethod("DELETE"), paramsOf("ia-2"));
    await RESET(
      reqMethod("POST", { newPassword: "New-password1!" }),
      paramsOf("ia-2"),
    );

    expect(String(fetchSpy.mock.calls[0][0])).toMatch(
      /\/integration-admins\/ia-2$/,
    );
    expect(String(fetchSpy.mock.calls[1][0])).toMatch(
      /\/integration-admins\/ia-2\/reset-password$/,
    );
  });
});
