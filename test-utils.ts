// Shared by every jsdom-environment component test. jsdom has no built-in fetch/Response —
// these components only touch `.ok` and `.json()` on what fetch resolves to, so a plain
// object is enough without polyfilling the real Fetch API classes (see login-form.test.tsx
// for where this pattern started).
export function mockJsonResponse(body: unknown, status: number) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}
