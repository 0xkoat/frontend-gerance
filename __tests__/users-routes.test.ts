/**
 * @jest-environment node
 */
// Covers the users Route Handlers that were previously untested (see the "Testing" backlog
// in CLAUDE.md): everything under src/app/api/users/**. These all read the session cookie
// via next/headers' cookies(), which is request-scoped and throws outside a real request —
// mocking the module is the strategy the backlog called for.
import { SESSION_COOKIE } from "@/lib/session";
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
const superAdminToken = fakeToken({
  sub: "sa-1",
  role: "SUPER_ADMIN",
  tenantId: null,
  mustChangePassword: false,
});
const viewerToken = fakeToken({
  sub: "viewer-1",
  role: "VIEWER",
  tenantId: "t1",
  mustChangePassword: false,
});

function req(body?: unknown) {
  return new Request("http://localhost:3001/irrelevant", {
    method: "POST",
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

describe("POST /api/users", () => {
  it("401s with no session", async () => {
    setSession(null);
    const { POST } = await import("@/app/api/users/route");

    const res = await POST(req({}));

    expect(res.status).toBe(401);
  });

  it("403s for a non-Admin session", async () => {
    setSession(viewerToken);
    const { POST } = await import("@/app/api/users/route");

    const res = await POST(req({}));

    expect(res.status).toBe(403);
  });

  it("400s on invalid input without calling the backend", async () => {
    setSession(adminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { POST } = await import("@/app/api/users/route");

    const res = await POST(req({ name: "", email: "not-an-email" }));

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards a valid payload to POST /users and returns 201", async () => {
    setSession(adminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { id: "u2", name: "Sara Ben Ali" },
          201,
        ) as unknown as Response,
      );
    const { POST } = await import("@/app/api/users/route");

    const res = await POST(
      req({
        name: "Sara Ben Ali",
        email: "sara@meridian.test",
        password: "Str0ng!Pass",
        phoneNumber: "+21620000020",
        role: "ANALYST",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ name: "Sara Ben Ali" });
  });

  it("relays the backend's first error message on failure", async () => {
    setSession(adminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { statusCode: 409, message: "A user with this email already exists" },
          409,
        ) as unknown as Response,
      );
    const { POST } = await import("@/app/api/users/route");

    const res = await POST(
      req({
        name: "Sara Ben Ali",
        email: "sara@meridian.test",
        password: "Str0ng!Pass",
        phoneNumber: "+21620000020",
        role: "ANALYST",
      }),
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/already exists/i);
  });
});

function getReq(query = "") {
  return new Request(`http://localhost:3001/api/users${query}`);
}

describe("GET /api/users", () => {
  it("403s for a non-Admin session", async () => {
    setSession(viewerToken);
    const { GET } = await import("@/app/api/users/route");

    const res = await GET(getReq());

    expect(res.status).toBe(403);
  });

  it("returns the backend's paginated list on success", async () => {
    setSession(adminToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { users: [{ id: "u1" }], total: 1, page: 1, pageSize: 20 },
          200,
        ) as unknown as Response,
      );
    const { GET } = await import("@/app/api/users/route");

    const res = await GET(getReq());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      users: [{ id: "u1" }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    expect(fetchSpy.mock.calls[0][0]).toMatch(/\/users$/);
  });

  it("forwards page and pageSize query params to the backend", async () => {
    setSession(adminToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { users: [], total: 0, page: 2, pageSize: 5 },
          200,
        ) as unknown as Response,
      );
    const { GET } = await import("@/app/api/users/route");

    await GET(getReq("?page=2&pageSize=5"));

    expect(fetchSpy.mock.calls[0][0]).toMatch(/\/users\?page=2&pageSize=5$/);
  });
});

describe("PATCH /api/users/:id", () => {
  it("403s for a non-Admin session", async () => {
    setSession(viewerToken);
    const { PATCH } = await import("@/app/api/users/[id]/route");

    const res = await PATCH(req({ name: "New Name" }), paramsOf("u2"));

    expect(res.status).toBe(403);
  });

  it("400s on invalid input", async () => {
    setSession(adminToken);
    const { PATCH } = await import("@/app/api/users/[id]/route");

    const res = await PATCH(req({ email: "not-an-email" }), paramsOf("u2"));

    expect(res.status).toBe(400);
  });

  it("forwards a valid payload and returns the updated user", async () => {
    setSession(adminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { id: "u2", name: "New Name" },
          200,
        ) as unknown as Response,
      );
    const { PATCH } = await import("@/app/api/users/[id]/route");

    const res = await PATCH(req({ name: "New Name" }), paramsOf("u2"));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "New Name" });
  });
});

describe("DELETE /api/users/:id", () => {
  it("relays the backend's self-delete rejection", async () => {
    setSession(adminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { statusCode: 403, message: "You cannot delete your own account" },
          403,
        ) as unknown as Response,
      );
    const { DELETE } = await import("@/app/api/users/[id]/route");

    const res = await DELETE(req(), paramsOf("admin-1"));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/cannot delete your own account/i);
  });

  it("returns the backend's success body", async () => {
    setSession(adminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { message: "User deleted", id: "u2" },
          200,
        ) as unknown as Response,
      );
    const { DELETE } = await import("@/app/api/users/[id]/route");

    const res = await DELETE(req(), paramsOf("u2"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "User deleted", id: "u2" });
  });
});

describe("PATCH /api/users/:id/role", () => {
  it("400s on an invalid role", async () => {
    setSession(adminToken);
    const { PATCH } = await import("@/app/api/users/[id]/role/route");

    const res = await PATCH(req({ role: "SUPER_ADMIN" }), paramsOf("u2"));

    expect(res.status).toBe(400);
  });

  it("forwards a valid role change", async () => {
    setSession(adminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { id: "u2", role: "ADMIN" },
          200,
        ) as unknown as Response,
      );
    const { PATCH } = await import("@/app/api/users/[id]/role/route");

    const res = await PATCH(req({ role: "ADMIN" }), paramsOf("u2"));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ role: "ADMIN" });
  });

  it("relays the backend's last-Admin conflict", async () => {
    setSession(adminToken);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          statusCode: 409,
          message: "Cannot demote the last remaining Admin in this tenant",
        },
        409,
      ) as unknown as Response,
    );
    const { PATCH } = await import("@/app/api/users/[id]/role/route");

    const res = await PATCH(req({ role: "VIEWER" }), paramsOf("u2"));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/last remaining admin/i);
  });
});

describe("POST /api/users/:id/reset-password", () => {
  it("400s on a weak password", async () => {
    setSession(adminToken);
    const { POST } = await import("@/app/api/users/[id]/reset-password/route");

    const res = await POST(req({ newPassword: "weak" }), paramsOf("u2"));

    expect(res.status).toBe(400);
  });

  it("403s for a non-Admin, non-Super-Admin session", async () => {
    setSession(viewerToken);
    const { POST } = await import("@/app/api/users/[id]/reset-password/route");

    const res = await POST(req({ newPassword: "Str0ng!Pass" }), paramsOf("u2"));

    expect(res.status).toBe(403);
  });

  it("lets a Super Admin session through the guard (the sole-Admin rule is the backend's)", async () => {
    setSession(superAdminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { message: "Password reset" },
          200,
        ) as unknown as Response,
      );
    const { POST } = await import("@/app/api/users/[id]/reset-password/route");

    const res = await POST(
      req({ newPassword: "Str0ng!Pass" }),
      paramsOf("admin-2"),
    );

    expect(res.status).toBe(200);
  });

  it("relays the backend's co-Admin conflict for a Super Admin caller", async () => {
    setSession(superAdminToken);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          statusCode: 409,
          message: "This tenant has other Admins who can reset this password",
        },
        409,
      ) as unknown as Response,
    );
    const { POST } = await import("@/app/api/users/[id]/reset-password/route");

    const res = await POST(
      req({ newPassword: "Str0ng!Pass" }),
      paramsOf("admin-2"),
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/other admins/i);
  });

  it("forwards a strong password and returns the backend's message", async () => {
    setSession(adminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { message: "Password reset" },
          200,
        ) as unknown as Response,
      );
    const { POST } = await import("@/app/api/users/[id]/reset-password/route");

    const res = await POST(req({ newPassword: "Str0ng!Pass" }), paramsOf("u2"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Password reset" });
  });
});

describe("PATCH /api/users/me/password", () => {
  it("401s with no session", async () => {
    setSession(null);
    const { PATCH } = await import("@/app/api/users/me/password/route");

    const res = await PATCH(
      req({ currentPassword: "Old1234!", newPassword: "New1234!" }),
    );

    expect(res.status).toBe(401);
  });

  it("400s when the new password matches the current one", async () => {
    setSession(adminToken);
    const { PATCH } = await import("@/app/api/users/me/password/route");

    const res = await PATCH(
      req({ currentPassword: "Same1234!", newPassword: "Same1234!" }),
    );

    expect(res.status).toBe(400);
  });

  it("rotates the session cookie with the backend's fresh token on success", async () => {
    const store = setSession(adminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { message: "Password changed", access_token: "new.jwt.token" },
          200,
        ) as unknown as Response,
      );
    const { PATCH } = await import("@/app/api/users/me/password/route");

    const res = await PATCH(
      req({ currentPassword: "Old1234!", newPassword: "New1234!" }),
    );

    expect(res.status).toBe(200);
    expect(store.set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      "new.jwt.token",
      expect.objectContaining({ httpOnly: true }),
    );
  });
});
