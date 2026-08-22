/**
 * @jest-environment node
 */
// Companion to login-route.test.ts's CSRF regression test — this route has the same
// no-preflight exposure (see the comment on POST in
// src/app/api/auth/forgot-password/route.ts) and now carries the same Content-Type guard.
// Unlike login, this handler never touches next/headers' cookies(), so it's fully testable
// end to end (guard, validation, and the backend passthrough) without mocking anything but
// fetch.
import { POST } from "@/app/api/auth/forgot-password/route";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3001/api/auth/forgot-password", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password — Content-Type guard", () => {
  it("rejects a text/plain body (the no-cors CSRF bypass shape) with 415", async () => {
    const response = await POST(
      request(
        { email: "victim@example.com" },
        { "content-type": "text/plain" },
      ),
    );

    expect(response.status).toBe(415);
    const body = await response.json();
    expect(body.message).toMatch(/unsupported content type/i);
  });

  it("rejects a request with no Content-Type at all", async () => {
    const response = await POST(request({ email: "victim@example.com" }));

    expect(response.status).toBe(415);
  });
});

describe("POST /api/auth/forgot-password — validation", () => {
  it("rejects an invalid email with 400 and never calls the backend", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");

    const response = await POST(
      request(
        { email: "not-an-email" },
        { "content-type": "application/json" },
      ),
    );

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("POST /api/auth/forgot-password — backend passthrough", () => {
  it("relays the backend's generic anti-enumeration message and status", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message:
            "If an account exists with this email, your administrator has been notified.",
        }),
        { status: 200 },
      ),
    );

    const response = await POST(
      request(
        { email: "someone@example.com" },
        { "content-type": "application/json" },
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toMatch(/administrator has been notified/i);
    fetchSpy.mockRestore();
  });
});
