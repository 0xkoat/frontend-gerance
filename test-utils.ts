// Shared by every jsdom-environment component test. jsdom has no built-in fetch/Response —
// these components only touch `.ok` and `.json()` on what fetch resolves to, so a plain
// object is enough without polyfilling the real Fetch API classes (see login-form.test.tsx
// for where this pattern started).
export function mockJsonResponse(body: unknown, status: number) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

// Shared by node-environment Route Handler tests that decode a session cookie
// (src/lib/jwt.ts only decodes, never verifies — see its doc comment — so a syntactically
// valid unsigned token is enough). Started in proxy.test.ts; duplicated here rather than
// imported from it since proxy.test.ts is standalone and this is the general-purpose copy.
export function fakeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}
