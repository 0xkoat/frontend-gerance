import { defineConfig, devices } from "@playwright/test";

// Live, full-stack E2E suite — real browser against the real Next.js dev
// server AND the real NestJS API + Postgres behind it (not mocked, unlike
// the Jest suite in __tests__/). Deliberately does NOT use Playwright's
// `webServer` option to auto-start anything: this suite needs the backend
// and a seeded database up too, and getting both of those "auto-started
// and torn down" reliably is a bigger, separate piece of work than this
// suite itself. Precondition, matching how this project's own CLAUDE.md
// already verifies everything "live against the real dev server + Postgres":
//
//   1. `docker compose up -d` in backend/ (Postgres)
//   2. `npm run start:dev` in backend/ (NestJS on :3000)
//   3. `npm run seed:demo` in backend/ at least once (the fixed demo tenants/
//      users this suite logs in as — see e2e/fixtures/accounts.ts)
//   4. `npm run dev` in frontend/ (Next.js on :3001)
//
// Then `npm run test:e2e` here. CI wiring (bringing all four up itself) is
// tracked separately, not part of this suite's own scope.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shared demo tenant data — parallel runs would race each other's assign/status mutations
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  // Generous, not just "the default": a handful of tests (tenants.spec.ts,
  // users.spec.ts) make more than one real auth-controller call to prove a
  // forced-first-login/reset-forces-change flow, and helpers.ts's
  // paceAuthCall() can legitimately wait up to ~13s before each one to stay
  // under the shared rate limit (see its own doc comment) — two or three of
  // those waits alone can approach a default 30s test timeout before any
  // real UI work happens. Found live: the first run under the default
  // timeout killed mid-test, right inside a cleanup block, leaving a
  // half-finished test double behind it had to be cleaned up by hand.
  timeout: 90_000,
  expect: { timeout: 8_000 },
  use: {
    // Overridable so this suite can also run against a real deployed target (e.g. the
    // Azure VM) instead of only a local dev server — added 2026-08-22. Defaults to
    // localhost, unchanged from before, so nothing about local runs changes unless
    // E2E_BASE_URL is explicitly set.
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
});
