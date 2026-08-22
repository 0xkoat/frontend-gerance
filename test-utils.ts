import { SESSION_COOKIE } from "@/lib/session";

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

// Shared by every node-environment Route Handler test that mocks next/headers' cookies()
// to simulate a session (found duplicated byte-for-byte, hardcoded cookie name and all,
// across 9 test files by /code-review — extracted here rather than left copy-pasted).
// Each test file still has to call `jest.mock("next/headers", () => ({ cookies: jest.fn()
// }))` itself — Jest's hoisting (babel-plugin-jest-hoist) only rewrites `jest.mock` calls
// it finds literally in the file being compiled, so that registration can't move into a
// shared helper, only the store-building logic behind it can. Usage in each test file:
//   import { cookies } from "next/headers";
//   function setSession(token: string | null) {
//     return setSessionCookie(cookies as jest.Mock, token);
//   }
export function setSessionCookie(
  mockedCookies: jest.Mock,
  token: string | null,
) {
  const store = {
    get: (name: string) =>
      token && name === SESSION_COOKIE ? { value: token } : undefined,
    set: jest.fn(),
    delete: jest.fn(),
  };
  mockedCookies.mockResolvedValue(store);
  return store;
}
