/**
 * @jest-environment node
 */
// Phase 1 auth migration coverage (refresh-token rotation, see CLAUDE.md's "Frontend auth
// architecture" section and its Phase 1 checklist): the parts of the login/refresh/logout
// Route Handlers and backendFetchAuthed's lazy-refresh-on-401 retry that read/write
// next/headers' cookies() — mocked the same way __tests__/users-routes.test.ts established
// for Route Handler tests that need a cookie store.
import { SESSION_COOKIE } from "@/lib/session";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));
import { cookies } from "next/headers";

const REFRESH_COOKIE = "refresh_token";

// Unlike users-routes.test.ts's cookie store (read-only from the test's point of view,
// since those routes never write cookies), this one also needs to track .set()/.delete()
// calls made by the code under test — login, refresh, and backendFetchAuthed's retry path
// all rotate cookies, not just read them.
function makeCookieStore(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const get = jest.fn((name: string) =>
    store.has(name) ? { name, value: store.get(name)! } : undefined,
  );
  const set = jest.fn((name: string, value: string) => {
    store.set(name, value);
  });
  const del = jest.fn((arg: string | { name: string }) => {
    store.delete(typeof arg === "string" ? arg : arg.name);
  });
  return { get, set, delete: del };
}

function refreshSetCookieHeader(value: string) {
  return `${REFRESH_COOKIE}=${value}; Path=/api/auth; HttpOnly; SameSite=Lax; Expires=Wed, 09 Sep 2026 00:00:00 GMT`;
}

afterEach(() => {
  jest.restoreAllMocks();
  (cookies as jest.Mock).mockReset();
});

describe("refreshAccessToken", () => {
  it("returns null and never calls the backend when there is no refresh_token cookie", async () => {
    (cookies as jest.Mock).mockResolvedValue(makeCookieStore({}));
    const fetchSpy = jest.spyOn(global, "fetch");

    const { refreshAccessToken } = await import("@/lib/backend");
    const result = await refreshAccessToken();

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null and touches no cookie when the backend rejects the refresh token", async () => {
    const store = makeCookieStore({ [REFRESH_COOKIE]: "reused-or-expired" });
    (cookies as jest.Mock).mockResolvedValue(store);
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid refresh token" }), {
        status: 401,
      }),
    );

    const { refreshAccessToken } = await import("@/lib/backend");
    const result = await refreshAccessToken();

    expect(result).toBeNull();
    expect(store.set).not.toHaveBeenCalled();
  });

  it("rotates both cookies and returns mustChangePassword on success", async () => {
    const store = makeCookieStore({ [REFRESH_COOKIE]: "old" });
    (cookies as jest.Mock).mockResolvedValue(store);
    const headers = new Headers();
    headers.append("set-cookie", refreshSetCookieHeader("rotated"));
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: "fresh", mustChangePassword: true }),
          { status: 200, headers },
        ),
      );

    const { refreshAccessToken } = await import("@/lib/backend");
    const result = await refreshAccessToken();

    expect(result).toEqual({ mustChangePassword: true });
    expect(store.set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      "fresh",
      expect.any(Object),
    );
    expect(store.set).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      "rotated",
      expect.objectContaining({ path: "/api/auth", httpOnly: true }),
    );
  });
});

describe("backendFetchAuthed — lazy refresh on 401", () => {
  it("refreshes once and retries the original request after a 401", async () => {
    const store = makeCookieStore({
      [SESSION_COOKIE]: "oldAccess",
      [REFRESH_COOKIE]: "oldRefresh",
    });
    (cookies as jest.Mock).mockResolvedValue(store);

    let dataCalls = 0;
    jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        const headers = new Headers();
        headers.append("set-cookie", refreshSetCookieHeader("newRefresh"));
        return new Response(
          JSON.stringify({
            access_token: "newAccess",
            mustChangePassword: false,
          }),
          { status: 200, headers },
        );
      }
      dataCalls += 1;
      if (dataCalls === 1) {
        return new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
        });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const { backendFetchAuthed } = await import("@/lib/backend");
    const res = await backendFetchAuthed("/users");

    expect(res.status).toBe(200);
    expect(dataCalls).toBe(2); // original 401 + retried 200
    expect(store.set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      "newAccess",
      expect.any(Object),
    );
    expect(store.set).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      "newRefresh",
      expect.any(Object),
    );
  });

  it("does not attempt a second refresh on a second consecutive 401", async () => {
    const store = makeCookieStore({
      [SESSION_COOKIE]: "oldAccess",
      [REFRESH_COOKIE]: "oldRefresh",
    });
    (cookies as jest.Mock).mockResolvedValue(store);

    let refreshCalls = 0;
    let dataCalls = 0;
    jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        const headers = new Headers();
        headers.append("set-cookie", refreshSetCookieHeader("newRefresh"));
        return new Response(
          JSON.stringify({
            access_token: "newAccess",
            mustChangePassword: false,
          }),
          { status: 200, headers },
        );
      }
      dataCalls += 1;
      // Backend keeps rejecting even after a refresh (e.g. some other reason than
      // expiry) — should still only cost one refresh attempt, not a loop.
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
      });
    });

    const { backendFetchAuthed } = await import("@/lib/backend");
    const res = await backendFetchAuthed("/users");

    expect(res.status).toBe(401);
    expect(refreshCalls).toBe(1);
    expect(dataCalls).toBe(2); // original attempt + exactly one retry
  });

  it("propagates the original 401 without calling refresh when there is no refresh_token cookie", async () => {
    const store = makeCookieStore({ [SESSION_COOKIE]: "oldAccess" });
    (cookies as jest.Mock).mockResolvedValue(store);

    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
      }),
    );

    const { backendFetchAuthed } = await import("@/lib/backend");
    const res = await backendFetchAuthed("/users");

    expect(res.status).toBe(401);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // never even tried /auth/refresh
  });
});

describe("POST /api/auth/refresh", () => {
  it("200s with mustChangePassword on a successful refresh", async () => {
    const store = makeCookieStore({ [REFRESH_COOKIE]: "old" });
    (cookies as jest.Mock).mockResolvedValue(store);
    const headers = new Headers();
    headers.append("set-cookie", refreshSetCookieHeader("rotated"));
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: "fresh", mustChangePassword: false }),
          { status: 200, headers },
        ),
      );

    const { POST } = await import("@/app/api/auth/refresh/route");
    const res = await POST();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ mustChangePassword: false });
  });

  it("401s when there is no refresh_token cookie to use", async () => {
    (cookies as jest.Mock).mockResolvedValue(makeCookieStore({}));

    const { POST } = await import("@/app/api/auth/refresh/route");
    const res = await POST();

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("forwards both tokens to the backend, then clears local cookies", async () => {
    const store = makeCookieStore({
      [SESSION_COOKIE]: "access1",
      [REFRESH_COOKIE]: "refresh1",
    });
    (cookies as jest.Mock).mockResolvedValue(store);
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Logged out" }), {
        status: 200,
      }),
    );

    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST();

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    const sentHeaders = init?.headers as Record<string, string>;
    expect(sentHeaders.Authorization).toBe("Bearer access1");
    expect(sentHeaders.Cookie).toBe("refresh_token=refresh1");
    expect(store.delete).toHaveBeenCalled();
  });

  it("still clears local cookies even if the backend call fails", async () => {
    const store = makeCookieStore({
      [SESSION_COOKIE]: "access1",
      [REFRESH_COOKIE]: "refresh1",
    });
    (cookies as jest.Mock).mockResolvedValue(store);
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));

    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST();

    expect(res.status).toBe(200);
    expect(store.delete).toHaveBeenCalled();
  });

  it("skips the backend call entirely when there is no session", async () => {
    (cookies as jest.Mock).mockResolvedValue(makeCookieStore({}));
    const fetchSpy = jest.spyOn(global, "fetch");

    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST();

    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/login — refresh cookie relay", () => {
  it("relays the backend's rotated refresh_token cookie to the browser on success", async () => {
    const store = makeCookieStore({});
    (cookies as jest.Mock).mockResolvedValue(store);
    const headers = new Headers();
    headers.append("set-cookie", refreshSetCookieHeader("issued"));
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "access1",
          mustChangePassword: false,
        }),
        { status: 200, headers },
      ),
    );

    const { POST } = await import("@/app/api/auth/login/route");
    const request = new Request("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "x" }),
    });

    const res = await POST(request);

    expect(res.status).toBe(200);
    expect(store.set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      "access1",
      expect.any(Object),
    );
    expect(store.set).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      "issued",
      expect.objectContaining({ path: "/api/auth" }),
    );
  });

  it("does not touch cookies when the backend rejects the login", async () => {
    const store = makeCookieStore({});
    (cookies as jest.Mock).mockResolvedValue(store);
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid credentials" }), {
        status: 401,
      }),
    );

    const { POST } = await import("@/app/api/auth/login/route");
    const request = new Request("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "x" }),
    });

    const res = await POST(request);

    expect(res.status).toBe(401);
    expect(store.set).not.toHaveBeenCalled();
  });
});
