# End-to-end tests

Real Chromium, driven by Playwright, against the real running stack — Next.js
dev server, NestJS API, and a seeded Postgres database. This is deliberately
not mocked, unlike `__tests__/` (Jest + React Testing Library, which mocks
every Route Handler's backend calls) — it's the layer above that, proving the
whole chain actually works together.

## Before running

1. `docker compose up -d postgres` at the repository root (Postgres). Compose reads the
   root `.env`; see the backend README.
2. `npm run start:dev` in `backend/` (NestJS on `:3000`).
3. `npm run seed:demo` in `backend/`, at least once — this is where the
   tenant/user identities in `e2e/fixtures/accounts.ts` come from. The seed
   script is deterministic (`faker.seed(20260819)`, added specifically for
   this), so re-running it reproduces the same names/emails.
4. `npm run dev` here in `frontend/` (Next.js on `:3001`).

Then:

```bash
npm run test:e2e          # headless, CLI output
npm run test:e2e:ui       # Playwright's interactive UI mode
npm run test:e2e:report   # open the HTML report from the last run
```

## Layout

- `auth.setup.ts` — logs in once per role (Super Admin, Admin, Analyst,
  Integration Admin) and saves the session to `.auth/*.json` (gitignored). Every other
  spec reuses one of these via `test.use({ storageState: ... })` instead of
  logging in through the UI — both faster and, per below, load-bearing.
- `helpers.ts` — shared actions (`login`, `logout`, `clickAndWaitForDialogClose`,
  `openRowMenu`, `loginInIsolatedContext`, …), each with a
  doc comment explaining a real bug it exists to avoid. Worth reading before
  writing a new spec — several of these encode a mistake that was easy to
  make and hard to diagnose the first time.
- `fixtures/accounts.ts` — the seeded credentials this suite logs in as.
- `*.spec.ts` — one file per area (`auth`, `rbac`, `tenants`, `users`,
  `modules`, `tickets`). `modules` covers the launch redirect and analyst
  level gating; `tickets` drives two live browsers for the notification flow.

## The one thing to know before touching auth

`AuthController` (login/refresh/logout/forgot-password) shares a single
5-requests-per-60-seconds throttle per client address across all four routes, with no
explicit `blockDuration` — tripping it blocks *every* auth call from this
machine for a full 60 seconds, not just the one that went over. Every real
call to that controller in this suite goes through `helpers.ts`'s
`paceAuthCall()`, which enforces safe spacing via a shared file (not an
in-memory variable — the `setup`/`chromium` projects run in separate worker
processes, so in-memory state doesn't survive the boundary between them).
Don't add a raw `page.goto("/login")` + form fill outside of `helpers.ts`'s
existing wrappers, or the suite will start intermittently 429ing again.

## Test data

Every test that creates a tenant or a user deletes it again in a `finally`
block. The ticket spec is the exception: the platform has no way to delete a
ticket, so each run leaves one `E2E SIEM ticket ...` (and its notifications) in
the first demo tenant. A full reseed, or deleting that tenant, clears them.

If a run is killed mid-test (Ctrl-C, a crashed browser) rather than failing
normally, the cleanup won't have run; check for stray rows named
`E2E Playwright *` under Tenants and Users before demoing.
