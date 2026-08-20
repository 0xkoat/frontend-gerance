/**
 * @jest-environment node
 */
// Covers src/app/api/tenants/**, previously untested (same gap and same cookies()-mocking
// strategy as users-routes.test.ts).
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
const adminToken = fakeToken({
  sub: "admin-1",
  role: "ADMIN",
  tenantId: "t1",
  mustChangePassword: false,
});

// Phase 11's new routes span GET/POST/PATCH/DELETE; req() below (kept for the existing,
// POST-only call sites) is just reqMethod("POST", body) rather than a second, separately
// maintained builder — found duplicated by /code-review, collapsed to one.
function reqMethod(method: string, body?: unknown) {
  return new Request("http://localhost:3001/irrelevant", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function req(body?: unknown) {
  return reqMethod("POST", body);
}

function paramsOf(id: string) {
  return { params: Promise.resolve({ id }) };
}

function paramsOfModule(id: string, moduleName: string) {
  return { params: Promise.resolve({ id, moduleName }) };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /api/tenants", () => {
  it("401s with no session", async () => {
    setSession(null);
    const { GET } = await import("@/app/api/tenants/route");

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("403s for a non-Super-Admin session", async () => {
    setSession(adminToken);
    const { GET } = await import("@/app/api/tenants/route");

    const res = await GET();

    expect(res.status).toBe(403);
  });

  it("returns the backend's tenant list", async () => {
    setSession(superAdminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          [{ id: "t1", name: "Meridian Corp" }],
          200,
        ) as unknown as Response,
      );
    const { GET } = await import("@/app/api/tenants/route");

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "t1", name: "Meridian Corp" }]);
  });
});

describe("POST /api/tenants", () => {
  it("403s for a non-Super-Admin session", async () => {
    setSession(adminToken);
    const { POST } = await import("@/app/api/tenants/route");

    const res = await POST(req({}));

    expect(res.status).toBe(403);
  });

  it("400s on invalid input without calling the backend", async () => {
    setSession(superAdminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { POST } = await import("@/app/api/tenants/route");

    const res = await POST(req({ tenantName: "" }));

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards a valid payload and returns 201", async () => {
    setSession(superAdminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { tenant: { id: "t2", name: "Atlas Security" }, admin: { id: "u9" } },
          201,
        ) as unknown as Response,
      );
    const { POST } = await import("@/app/api/tenants/route");

    const res = await POST(
      req({
        tenantName: "Atlas Security",
        name: "First Admin",
        email: "admin@atlas.test",
        password: "Str0ng!Pass",
        phoneNumber: "+21620000030",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.tenant).toMatchObject({ name: "Atlas Security" });
  });

  it("relays the backend's duplicate-email conflict", async () => {
    setSession(superAdminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { statusCode: 409, message: "A user with this email already exists" },
          409,
        ) as unknown as Response,
      );
    const { POST } = await import("@/app/api/tenants/route");

    const res = await POST(
      req({
        tenantName: "Atlas Security",
        name: "First Admin",
        email: "admin@atlas.test",
        password: "Str0ng!Pass",
        phoneNumber: "+21620000030",
      }),
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/already exists/i);
  });
});

describe("DELETE /api/tenants/:id", () => {
  it("403s for a non-Super-Admin session", async () => {
    setSession(adminToken);
    const { DELETE } = await import("@/app/api/tenants/[id]/route");

    const res = await DELETE(req(), paramsOf("t1"));

    expect(res.status).toBe(403);
  });

  it("returns the backend's cascade-delete confirmation", async () => {
    setSession(superAdminToken);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          message: "Tenant and all its accounts deleted successfully",
          id: "t1",
        },
        200,
      ) as unknown as Response,
    );
    const { DELETE } = await import("@/app/api/tenants/[id]/route");

    const res = await DELETE(req(), paramsOf("t1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "t1" });
  });

  it("relays a not-found error", async () => {
    setSession(superAdminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { statusCode: 404, message: "Tenant not found" },
          404,
        ) as unknown as Response,
      );
    const { DELETE } = await import("@/app/api/tenants/[id]/route");

    const res = await DELETE(req(), paramsOf("missing"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toMatch(/tenant not found/i);
  });
});

// Phase 11 (2026-08-07): PATCH /tenants/:id (rename) and the full TenantModule CRUD
// surface, all Super Admin-only matching the backend's class-level @Roles(SUPER_ADMIN).
describe("PATCH /api/tenants/:id (rename)", () => {
  it("403s for a non-Super-Admin session", async () => {
    setSession(adminToken);
    const { PATCH } = await import("@/app/api/tenants/[id]/route");

    const res = await PATCH(
      reqMethod("PATCH", { name: "New Name" }),
      paramsOf("t1"),
    );

    expect(res.status).toBe(403);
  });

  it("400s on an empty name without calling the backend", async () => {
    setSession(superAdminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { PATCH } = await import("@/app/api/tenants/[id]/route");

    const res = await PATCH(reqMethod("PATCH", { name: "" }), paramsOf("t1"));

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards a valid rename and returns the updated tenant", async () => {
    setSession(superAdminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { id: "t1", name: "Renamed Corp" },
          200,
        ) as unknown as Response,
      );
    const { PATCH } = await import("@/app/api/tenants/[id]/route");

    const res = await PATCH(
      reqMethod("PATCH", { name: "Renamed Corp" }),
      paramsOf("t1"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "Renamed Corp" });
  });

  it("relays a not-found error", async () => {
    setSession(superAdminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { statusCode: 404, message: "Tenant not found" },
          404,
        ) as unknown as Response,
      );
    const { PATCH } = await import("@/app/api/tenants/[id]/route");

    const res = await PATCH(
      reqMethod("PATCH", { name: "X" }),
      paramsOf("missing"),
    );

    expect(res.status).toBe(404);
  });
});

describe("GET/POST /api/tenants/:id/modules", () => {
  it("403s for a non-Super-Admin session on GET", async () => {
    setSession(adminToken);
    const { GET } = await import("@/app/api/tenants/[id]/modules/route");

    const res = await GET(reqMethod("GET"), paramsOf("t1"));

    expect(res.status).toBe(403);
  });

  it("GET returns the backend's module list", async () => {
    setSession(superAdminToken);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        [
          {
            id: "m1",
            tenantId: "t1",
            moduleName: "SIEM",
            isActive: true,
            config: null,
          },
        ],
        200,
      ) as unknown as Response,
    );
    const { GET } = await import("@/app/api/tenants/[id]/modules/route");

    const res = await GET(reqMethod("GET"), paramsOf("t1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ moduleName: "SIEM" });
  });

  it("POST 400s on an invalid moduleName without calling the backend", async () => {
    setSession(superAdminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { POST } = await import("@/app/api/tenants/[id]/modules/route");

    const res = await POST(
      reqMethod("POST", { moduleName: "NOT_A_MODULE" }),
      paramsOf("t1"),
    );

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POST forwards a valid activation and returns 201", async () => {
    setSession(superAdminToken);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          id: "m2",
          tenantId: "t1",
          moduleName: "VM",
          isActive: true,
          config: { a: 1 },
        },
        201,
      ) as unknown as Response,
    );
    const { POST } = await import("@/app/api/tenants/[id]/modules/route");

    const res = await POST(
      reqMethod("POST", { moduleName: "VM", config: { a: 1 } }),
      paramsOf("t1"),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ moduleName: "VM" });
  });

  it("POST relays the backend's already-configured conflict", async () => {
    setSession(superAdminToken);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          statusCode: 409,
          message:
            "VM is already configured for this tenant — use PATCH to update it",
        },
        409,
      ) as unknown as Response,
    );
    const { POST } = await import("@/app/api/tenants/[id]/modules/route");

    const res = await POST(
      reqMethod("POST", { moduleName: "VM" }),
      paramsOf("t1"),
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/already configured/i);
  });
});

describe("PATCH/DELETE /api/tenants/:id/modules/:moduleName", () => {
  it("403s for a non-Super-Admin session on PATCH", async () => {
    setSession(adminToken);
    const { PATCH } =
      await import("@/app/api/tenants/[id]/modules/[moduleName]/route");

    const res = await PATCH(
      reqMethod("PATCH", { isActive: false }),
      paramsOfModule("t1", "VM"),
    );

    expect(res.status).toBe(403);
  });

  it("PATCH forwards isActive/config and returns the updated row", async () => {
    setSession(superAdminToken);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          id: "m1",
          tenantId: "t1",
          moduleName: "VM",
          isActive: false,
          config: null,
        },
        200,
      ) as unknown as Response,
    );
    const { PATCH } =
      await import("@/app/api/tenants/[id]/modules/[moduleName]/route");

    const res = await PATCH(
      reqMethod("PATCH", { isActive: false }),
      paramsOfModule("t1", "VM"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ isActive: false });
  });

  it("PATCH relays a not-configured error", async () => {
    setSession(superAdminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { statusCode: 404, message: "VM is not configured for this tenant" },
          404,
        ) as unknown as Response,
      );
    const { PATCH } =
      await import("@/app/api/tenants/[id]/modules/[moduleName]/route");

    const res = await PATCH(
      reqMethod("PATCH", { isActive: true }),
      paramsOfModule("t1", "VM"),
    );

    expect(res.status).toBe(404);
  });

  it("DELETE 403s for a non-Super-Admin session", async () => {
    setSession(adminToken);
    const { DELETE } =
      await import("@/app/api/tenants/[id]/modules/[moduleName]/route");

    const res = await DELETE(reqMethod("DELETE"), paramsOfModule("t1", "VM"));

    expect(res.status).toBe(403);
  });

  it("DELETE 200s with no body for a Super Admin", async () => {
    setSession(superAdminToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({}, 200) as unknown as Response);
    const { DELETE } =
      await import("@/app/api/tenants/[id]/modules/[moduleName]/route");

    const res = await DELETE(reqMethod("DELETE"), paramsOfModule("t1", "VM"));

    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/tenants/t1/modules/VM");
    expect(init?.method).toBe("DELETE");
  });
});
