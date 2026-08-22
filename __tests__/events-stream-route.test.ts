/**
 * @jest-environment node
 */
// Covers the Phase 10 streaming Route Handler: GET /api/events/stream. Per the plan's own
// note (CLAUDE.md's Phase 10 checklist), exercising real byte-for-byte SSE streaming over an
// actual connection is better verified live than faked with a mock — this file covers what
// *is* meaningfully testable without that: the auth guard, the error-passthrough path, and
// that a successful backend response's real body/headers are forwarded correctly (using a
// real ReadableStream, a genuine Node global, not a stand-in object).
import { fakeToken, setSessionCookie } from "../test-utils";

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

describe("GET /api/events/stream", () => {
  it("401s with no session, without ever calling the backend", async () => {
    setSession(null);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { GET } = await import("@/app/api/events/stream/route");

    const res = await GET();

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("proxies a backend error as a text/event-stream error frame with the same status", async () => {
    setSession(viewerToken);
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      body: null,
    } as unknown as Response);
    const { GET } = await import("@/app/api/events/stream/route");

    const res = await GET();

    expect(res.status).toBe(403);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(await res.text()).toContain("event: error");
  });

  it("forwards a successful backend stream's real body and sets the right headers", async () => {
    setSession(viewerToken);
    const upstream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: hello\n\n"));
        controller.close();
      },
    });
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      body: upstream,
    } as unknown as Response);
    const { GET } = await import("@/app/api/events/stream/route");

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    expect(await res.text()).toBe("data: hello\n\n");

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/events/stream");
    expect((init?.headers as Record<string, string>)?.Authorization).toBe(
      `Bearer ${viewerToken}`,
    );
  });
});
