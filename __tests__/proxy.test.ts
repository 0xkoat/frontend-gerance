/**
 * @jest-environment node
 */
// Route protection is the one place a bug is genuinely dangerous (wrong redirect = wrong
// page shown), so this is the highest-value test in the suite even though proxy.ts is only
// an optimistic check, not the real security boundary (see proxy.ts's own doc comment and
// src/lib/session.ts's requireSession()) — the real boundary is the backend's guards, out
// of scope for a frontend test.
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { SESSION_COOKIE } from "@/lib/session";

// A minimal valid-shaped (but unsigned) JWT: header.payload.signature, base64url payload.
// proxy.ts only decodes, never verifies, so a syntactically valid unsigned token is enough
// to exercise its redirect logic — see src/lib/jwt.ts's doc comment for why that's safe.
function fakeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}

function requestTo(pathname: string, token?: string): NextRequest {
  const headers = new Headers();
  if (token) headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  return new NextRequest(new URL(pathname, "http://localhost:3001"), {
    headers,
  });
}

describe("proxy", () => {
  it("redirects an unauthenticated visitor away from a protected route", () => {
    const res = proxy(requestTo("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3001/login");
  });

  it("lets an unauthenticated visitor reach a public route", () => {
    const res = proxy(requestTo("/login"));
    expect(res.status).toBe(200); // NextResponse.next() reports as a 200 passthrough
  });

  it("redirects an authenticated visitor away from /login", () => {
    const token = fakeToken({
      sub: "u1",
      role: "ADMIN",
      tenantId: "t1",
      mustChangePassword: false,
    });
    const res = proxy(requestTo("/login", token));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3001/dashboard");
  });

  it("lets an authenticated visitor reach a protected route", () => {
    const token = fakeToken({
      sub: "u1",
      role: "ADMIN",
      tenantId: "t1",
      mustChangePassword: false,
    });
    const res = proxy(requestTo("/dashboard", token));
    expect(res.status).toBe(200);
  });

  it("force-redirects a mustChangePassword session to /change-password", () => {
    const token = fakeToken({
      sub: "u1",
      role: "ANALYST",
      tenantId: "t1",
      mustChangePassword: true,
    });
    const res = proxy(requestTo("/dashboard", token));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3001/change-password",
    );
  });

  it("does not redirect a mustChangePassword session that is already on /change-password", () => {
    const token = fakeToken({
      sub: "u1",
      role: "ANALYST",
      tenantId: "t1",
      mustChangePassword: true,
    });
    const res = proxy(requestTo("/change-password", token));
    expect(res.status).toBe(200);
  });

  it("treats an expired token as unauthenticated", () => {
    const token = fakeToken({
      sub: "u1",
      role: "ADMIN",
      tenantId: "t1",
      mustChangePassword: false,
      exp: Math.floor(Date.now() / 1000) - 60, // expired one minute ago
    });
    const res = proxy(requestTo("/dashboard", token));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3001/login");
  });
});
