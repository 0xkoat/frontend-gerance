/**
 * @jest-environment node
 */
// Regression test for the CSRF finding from the /security-review pass (see
// docs/internship-report-frontend.md §3.7): POST /api/auth/login used to accept any body
// request.json() could parse regardless of Content-Type, which let a cross-site,
// no-preflight request (Content-Type: text/plain + mode: "no-cors") plant an
// attacker-controlled session in a victim's browser. This only exercises the
// Content-Type-guard branch, which returns before any cookie/backend call — see the
// comment on POST in src/app/api/auth/login/route.ts for why that's the one safe-to-test
// slice of this handler without mocking next/headers' cookies().
import { POST } from "@/app/api/auth/login/route";

describe("POST /api/auth/login — Content-Type guard", () => {
  it("rejects a text/plain body (the no-cors CSRF bypass shape) with 415", async () => {
    const request = new Request("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({
        email: "attacker@evil.com",
        password: "whatever",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(415);
    const body = await response.json();
    expect(body.message).toMatch(/unsupported content type/i);
  });

  it("rejects a request with no Content-Type at all", async () => {
    const request = new Request("http://localhost:3001/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", password: "x" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(415);
  });

  it("does not reject a real application/json request at the Content-Type check", async () => {
    // Past the guard, the handler calls the real backend and — on success — next/headers'
    // cookies() (request-scoped, unmockable in plain Jest). Mock fetch to return a non-ok
    // response so the handler takes its error branch and returns without ever reaching
    // cookies() — enough to prove the guard let a legitimate request through without
    // depending on a live backend or mocking the cookie store.
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid credentials" }), {
        status: 401,
      }),
    );

    const request = new Request("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ email: "a@b.com", password: "x" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401); // reached the backend call, not blocked at 415
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
