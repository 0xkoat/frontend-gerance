/**
 * @jest-environment node
 */
// Covers the Phase 9 Route Handler: GET /api/assets/feed. Same next/headers cookie-store
// mocking strategy as __tests__/siem-routes.test.ts and friends.
import { fakeToken, mockJsonResponse, setSessionCookie } from "../test-utils";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));
import { cookies } from "next/headers";

function setSession(token: string | null) {
  return setSessionCookie(cookies as jest.Mock, token);
}

const viewerToken = fakeToken({
  sub: "viewer-1",
  role: "VIEWER",
  tenantId: "t1",
  mustChangePassword: false,
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /api/assets/feed", () => {
  it("401s with no session", async () => {
    setSession(null);
    const { GET } = await import("@/app/api/assets/feed/route");

    const res = await GET(new Request("http://localhost:3001/api/assets/feed"));

    expect(res.status).toBe(401);
  });

  it("is reachable by a Viewer — the feed is read-only, no @Roles() on the backend route", async () => {
    setSession(viewerToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as Response);
    const { GET } = await import("@/app/api/assets/feed/route");

    const res = await GET(new Request("http://localhost:3001/api/assets/feed"));

    expect(res.status).toBe(200);
  });

  it("forwards severity/assignedToUserId/date/page filters as-is", async () => {
    setSession(viewerToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as Response);
    const { GET } = await import("@/app/api/assets/feed/route");

    const res = await GET(
      new Request(
        "http://localhost:3001/api/assets/feed?severity=CRITICAL&assignedToUserId=11111111-1111-4111-8111-111111111111&dateFrom=2026-08-01&page=2&pageSize=50",
      ),
    );

    expect(res.status).toBe(200);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/assets/feed?");
    expect(String(url)).toContain("severity=CRITICAL");
    expect(String(url)).toContain(
      "assignedToUserId=11111111-1111-4111-8111-111111111111",
    );
    expect(String(url)).toContain("dateFrom=2026-08-01");
    expect(String(url)).toContain("page=2");
    expect(String(url)).toContain("pageSize=50");
  });

  it("normalizes a backend error into { message }", async () => {
    setSession(viewerToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse(
          { statusCode: 500, message: "Internal error" },
          500,
        ) as Response,
      );
    const { GET } = await import("@/app/api/assets/feed/route");

    const res = await GET(new Request("http://localhost:3001/api/assets/feed"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal error" });
  });
});
