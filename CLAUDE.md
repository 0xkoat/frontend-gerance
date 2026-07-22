@AGENTS.md

# Frontend — SecOps

Next.js client for the SecOps multi-tenant SOC SaaS platform. See root `../CLAUDE.md` for
overall project context and the backend API contract, and `../backend/CLAUDE.md` for the
RBAC/provisioning model this UI has to respect. This file is the frontend-specific
counterpart, kept in sync by hand as the project develops. For the full narrative
development log (chronological, with rationale — mirrors `backend/docs/
internship-report-backend.md`), see `docs/internship-report-frontend.md`.

# Stack (as actually installed, 2026-07-16 — re-verify against package.json before trusting)

- Next.js 16.2.10, App Router, `src/` directory, Turbopack
- React 19.2.4, TypeScript 5.9.3 — **note:** the architecture spec PDF calls for
  TypeScript 6.0.3; what actually installs via `create-next-app`'s `"typescript": "^5"` is
  5.9.3. Unresolved discrepancy — check `npm view typescript versions` before assuming the
  spec is stale or that 6.x should be force-installed.
- Tailwind CSS v4 (CSS-first config via `@theme` in `src/app/globals.css` — no
  `tailwind.config.ts`)
- shadcn/ui, `"style": "base-nova"` preset — **built on `@base-ui/react`, not Radix UI.**
  Component internals (`Select`, `Dialog`, etc.) use Base UI's prop shapes, which sometimes
  differ from Radix's (e.g. `Select`'s `onValueChange` is `(value: string | null, details) =>
void`, nullable). Don't copy Radix-era shadcn examples from older tutorials without
  checking the actual generated component in `src/components/ui/`.
- No `form.tsx` / react-hook-form in this shadcn version — forms use shadcn's `field.tsx`
  primitives (`Field`, `FieldLabel`, `FieldError`, etc., framework-agnostic markup) with
  manual `useState` + `zod` `safeParse` validation, matching the pattern Next's own bundled
  docs recommend (see below). No `react-hook-form` dependency in this project.
- `zod` for schema validation (`src/lib/validations/`), hand-kept in sync with the backend's
  `class-validator` DTOs — same "no shared types package" tradeoff as the rest of the API
  contract (see root CLAUDE.md).
- `sonner` for toasts, `lucide-react` for icons — both pulled in by `shadcn init`.
- `recharts` is **not** installed. The Security Overview dashboard's severity/attack-source
  visuals are hand-built with Tailwind (see `src/components/dashboard/`) following the
  `dataviz` skill's form/color guidance instead — reach for `recharts` only when a chart
  needs real interactivity (zoom, brush, tooltips syncing across series) that plain
  HTML/CSS can't reasonably do.

## Read this before writing App Router code

`AGENTS.md` (imported above) is not boilerplate — this Next.js version has real breaking
changes from older docs/training data. Two already caught by checking
`node_modules/next/dist/docs/`:

- **`middleware.ts` is deprecated → renamed to `proxy.ts`**, exported function named
  `proxy` (or default export). See `src/proxy.ts` and
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- The authentication guide at
  `node_modules/next/dist/docs/01-app/02-guides/authentication.md` is the actual source for
  this project's auth pattern (DAL, optimistic vs. secure checks, httpOnly cookies) — it's
  what `src/lib/session.ts` and `src/proxy.ts` follow. Re-check it before changing auth flow.

When in doubt about a Next.js API on this project, grep `node_modules/next/dist/docs/`
before assuming prior knowledge is current.

# Directory structure

```
src/
  app/
    login/                                             — Figure 1 split-panel, NOT in (auth)
    (auth)/forgot-password, change-password             — public-ish, centered layout
    (dashboard)/dashboard, users, tenants, [module]      — sidebar layout, session-gated
    api/auth/..., api/users/..., api/tenants/...         — Route Handlers (BFF proxy layer)
    icon.tsx                                             — generated favicon (next/og)
    not-found.tsx, error.tsx, global-error.tsx, loading.tsx  — see error.md's `unstable_retry`
                                                                note below; not-found.tsx
                                                                deliberately doesn't call
                                                                getSession() (see its own
                                                                comment — forces static pages
                                                                dynamic app-wide otherwise)
    layout.tsx, page.tsx, globals.css
  components/
    ui/          — shadcn-generated, don't hand-edit the primitives casually
    auth/        — login/forgot-password/change-password forms
    dashboard/   — sidebar nav, KPI cards, severity/attack-source visuals, alerts table
    users/       — Admin user list, create-user form, UserRowActions (edit/role/reset/delete
                   dropdown + dialogs)
    tenants/     — Super Admin tenant list, create form, delete-confirm button
  lib/
    session.ts    — cookie read/write, getSession()/requireSession() (server-only)
    jwt.ts        — pure JWT payload decode, shared by session.ts and proxy.ts (no
                    "server-only", since proxy runs in a separate runtime that can't import
                    next/headers)
    backend.ts    — server-only fetch wrapper to the NestJS API (backendFetch /
                    backendFetchAuthed)
    api-guards.ts — shared requireAdmin()/requireSuperAdmin() fast-fail checks for Route
                    Handlers (NOT the security boundary — see the file's own doc comment)
    zod-errors.ts — fieldErrorsFromZod(): first-issue-per-field from a ZodError, used by
                    every form that shows inline field errors
    validations/  — zod schemas mirrored from backend DTOs
    mock-data.ts, severity.ts, nav.ts
  types/auth.ts  — UserRole, SessionClaims — hand-matched to backend/src/generated/prisma
  proxy.ts       — optimistic route protection (see below)
__tests__/       — Jest + RTL, root-level (not under src/) so it's never mistaken for a route
test-utils.ts    — shared mockJsonResponse() helper, also root-level: anything placed inside
                   __tests__/ is picked up by Jest's default testMatch as its own suite, even
                   without a .test. suffix, which is why this isn't in __tests__/ itself
jest.config.ts, jest.setup.ts, __mocks__/empty.js  — see "Testing" in the functionality
                                                       backlog below for what's covered
next.config.ts   — security response headers (CSP, X-Frame-Options, etc.) + poweredByHeader
.prettierrc, .prettierignore  — npm run format / format:check
.nvmrc, package.json's "engines"  — both ">=22" / "22", matching what's actually installed
```

**Why `login/` isn't inside `(auth)/`:** Next.js route groups apply their `layout.tsx` to
every route underneath them, with no per-child opt-out — `(auth)/layout.tsx` centers its
children in a small card, which is right for `forgot-password`/`change-password` but wrong
for the Figure 1 split-panel design. Moving `login` to a sibling top-level route detaches it
from that layout without changing its URL (route groups never appear in the URL either way).

# Frontend auth architecture (decided, not just scaffolded — read before changing)

The backend is stateless JWT, `Authorization: Bearer <token>`, no refresh tokens, 1h expiry
(`JwtModule.register({ signOptions: { expiresIn: '1h' } })` in both `auth.module.ts` and
`users.module.ts`). The frontend wraps that in a small BFF (backend-for-frontend) layer
instead of having client-side JS hold the token directly:

1. **The browser never sees the raw JWT.** `POST /api/auth/login` (a Next.js Route
   Handler, `src/app/api/auth/login/route.ts`) calls the real backend, then stores the
   `access_token` in an **httpOnly** cookie (`secops_token`, `src/lib/session.ts`). Every
   other mutation that needs the token (`change-password`, `create user`) goes through its
   own Route Handler that reads the cookie server-side and attaches
   `Authorization: Bearer <token>` — see `src/lib/backend.ts`'s `backendFetchAuthed`.
   `login/route.ts` also rejects any request whose `Content-Type` isn't
   `application/json` before parsing the body — found by `/security-review`: without it, a
   cross-site page could reach this one route with no CORS preflight (`mode: "no-cors"` +
   `Content-Type: text/plain`, since `Request.json()` ignores the declared type) and plant
   an attacker-controlled session in a victim's browser (login CSRF). Every other mutating
   route is already safe by construction — they require the cookie to pre-exist, and
   `SameSite=Lax` keeps it off cross-site requests; login is the one route that doesn't
   need a pre-existing cookie, since its job is to create one.
2. **No signature verification on the frontend, on purpose.** The frontend doesn't hold
   `JWT_SECRET` and shouldn't — sharing it just to re-verify a token received a moment ago
   over a trusted server call buys nothing. `src/lib/jwt.ts` only _decodes_ (checks `exp`,
   nothing else). The backend's `JwtStrategy`/`JwtAuthGuard` verify the signature for real
   on every proxied request — that's the actual security boundary.
3. **Two layers of route protection, deliberately redundant:**
   - `src/proxy.ts` (Next's renamed middleware) does an _optimistic_ check — decodes the
     cookie, redirects logged-out visitors to `/login` and logged-in visitors with
     `mustChangePassword: true` to `/change-password`. Runs on every request, cheap, but
     easy to bypass in theory and shouldn't be trusted alone (this is Next's own stated
     guidance, not a guess).
   - `requireSession()` in `src/lib/session.ts` is the _real_ per-page boundary, called in
     every protected `page.tsx` (not just the shared layout — Next's auth guide explicitly
     warns that layouts don't re-run on sibling navigation, so a layout-only check can be
     stale). Admin-only pages additionally check `session.role` and redirect.
   - Underneath both of those, the **backend's own guards are the actual authorization
     boundary** (`JwtAuthGuard`, `RolesGuard`, `MustChangePasswordGuard` — see
     `backend/CLAUDE.md`). Nothing on the frontend is a substitute for those; they're UX
     polish (don't flash protected UI, give a nice error) on top of a backend that already
     enforces this server-side regardless of what the frontend does.
4. **Cookie lifetime matches the token** (`SESSION_MAX_AGE_SECONDS = 3600`) since there's no
   refresh token to extend it — a user's session silently expires when their JWT does, and
   the next request just 401s → gets redirected to `/login`. No "session felt like it was
   still alive" surprises.

If a future session wants to change this (e.g., add refresh tokens, switch to NextAuth/an
auth library), that's a real architecture change — flag it explicitly rather than quietly
swapping the cookie strategy.

# Backend integration

- `BACKEND_URL` (server-only env var, **not** `NEXT_PUBLIC_`) points at the NestJS API,
  including its `/api` prefix — see `.env.local.example`.
- **Port collision, handled but worth knowing:** the backend defaults to port 3000 when
  `PORT` is unset (`process.env.PORT ?? 3000` in `backend/src/main.ts`), which collides with
  Next's own dev default. This project's `npm run dev` / `npm run start` run on **3001**
  instead (`next dev -p 3001` in `package.json`) rather than touching the backend's default.
- Backend validation is strict (`whitelist: true, forbidNonWhitelisted: true` in
  `backend/src/main.ts`) — sending extra fields 400s. Route Handlers only forward
  zod-validated, DTO-shaped payloads for this reason.
- Nest's default exception body is `{ statusCode, message, error? }`, where `message` is a
  string _or_ a string array (class-validator's per-field errors). `firstErrorMessage()` in
  `src/lib/backend.ts` normalizes that for display.

# Known gaps / accepted simplifications (revisit deliberately, don't "fix" silently)

- **"Signup" ≠ public self-registration.** The backend has no `/auth/register` and never
  will (see `backend/CLAUDE.md`'s hard rule) — every account is created by an Admin via
  `POST /users`. What's built is `src/app/(dashboard)/users/page.tsx` (Admin-only, real
  backend integration: list + create subordinate user), not a public signup form.
- **Forgot-password is not an email reset link.** The backend's
  `POST /auth/forgot-password` just flags the account for the tenant Admin to notice
  (`passwordResetRequestedAt`) and always returns the same generic message regardless of
  whether the email exists (anti-enumeration). The frontend copy on
  `(auth)/forgot-password` reflects that — don't "fix" it to sound like a real email flow
  without changing the backend first.
- **Super Admin has no `/users/me`-equivalent.** `GET /users/me` throws
  `ForbiddenException` for accounts with no `tenantId`. The dashboard layout
  (`src/app/(dashboard)/layout.tsx`) falls back to JWT claims only for that role — there's
  currently no backend endpoint for a Super Admin to fetch their own profile. (Tenant data
  itself is real now — `src/app/(dashboard)/tenants/page.tsx` + `src/app/api/tenants/`
  wire up `GET`/`POST /tenants`, and the dashboard's `SuperAdminOverview` pulls the same
  real list instead of mock data. Tenant _deletion_ — `DELETE /tenants/:id` exists on the
  backend — has no UI yet.)
- **Dashboard content is mock data** (`src/lib/mock-data.ts`) because the SIEM/SOAR/CTI/
  EDR/DFIR/VM modules don't exist on the backend yet — only `auth`, `users`, `tenants` are
  implemented. The `[module]/page.tsx` stub route exists purely so the sidebar nav (which
  matches the architecture spec's Figure 2 mockup) doesn't link to 404s.
- **No row-level actions on the alerts table** (assign/escalate/resolve) — intentionally
  not faked with disabled buttons. Add them, and the Viewer read-only restriction on them,
  once there's a real SIEM module behind the table.
- **Admin can list/create users but not yet edit/delete/reset-password/change-role from
  the UI**, even though those backend endpoints exist (`PATCH/DELETE /users/:id`,
  `PATCH /users/:id/role`, `POST /users/:id/reset-password`). Listed as upcoming work below.
- **`npm audit` reports a moderate PostCSS advisory** — it's a transitive dependency
  _inside_ `next` itself; `npm audit fix --force` would downgrade Next.js to a `9.x`
  canary to "fix" it, which is worse than the advisory. Left as an accepted, low-relevance
  (build-time only, not exploitable via this app's actual usage) risk.
- Root layout hard-codes the `dark` class instead of wiring up a `next-themes` toggle — the
  UI spec is a dedicated dark console with no light-mode mockup or toggle control anywhere
  in Figures 1-4. `next-themes` is installed (pulled in by `shadcn init`) if a real toggle
  is wanted later.
- A first Jest + RTL test suite exists (`npm test`) but is far smaller than the backend's
  Jest + Supertest e2e coverage — see "Testing" in the functionality backlog below for
  exactly what's covered and what isn't.
- Favicon is generated (`src/app/icon.tsx`, matches the sidebar's brand mark), not a
  designed brand asset — fine as a placeholder, not final branding.

# Functionality backlog (what's still to build)

Full narrative of what's done and why lives in `docs/internship-report-frontend.md`. This
section is the working checklist — organized by area, not just priority order, so it's easy
to see what's missing in a given part of the app. Update it as items land; don't let it
drift from reality.

**Recently completed** (2026-07-16, fourth pass — a project-hygiene audit, "what's not
configured yet" beyond feature work): security response headers (CSP, `X-Frame-Options:
DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
`poweredByHeader: false` — see `next.config.ts`), custom `not-found.tsx`/`error.tsx`/
`global-error.tsx`/`loading.tsx` (this Next version renamed the error boundary's `reset`
prop convention to `unstable_retry` — caught by checking the local docs, not assumed),
Prettier (`.prettierrc`, `npm run format`/`format:check` — deliberately diverges from the
backend's `singleQuote: true` to match this codebase's actual established double-quote
convention, everything else matches), and Node version pinning (`.nvmrc` + `engines` in
`package.json`, both `>=22` matching what's actually installed and the backend's CI).
One real bug caught mid-implementation: giving `not-found.tsx` a session-aware "back to
dashboard vs. sign in" link required calling `getSession()`, which forced `/login`,
`/forgot-password`, and `/` from static into dynamic rendering app-wide (verified via the
build output's route table) — reverted to a plain link to `/` and let the already-existing
redirect logic (`page.tsx` + `proxy.ts`) resolve the destination for free, restoring static
rendering. CI (GitHub Actions running lint/typecheck/test/build, mirroring the backend's
`.github/workflows/test.yml`) was scoped out of this pass at the user's direction — still
listed in "Polish / infra" below.

Third pass, same day: the full Admin user-management action set —
edit profile, change role, reset another user's password, delete user — via a
`UserRowActions` dropdown + dialogs on `(dashboard)/users`, all wired to real
`PATCH/DELETE /api/users/[id]`, `PATCH /api/users/[id]/role`,
`POST /api/users/[id]/reset-password`. All four verified live against the backend,
including both self-target rejections (self-role-change, self-delete) passing through the
backend's actual error messages. Extracted the repeated Route-Handler role-check into
`src/lib/api-guards.ts` (`requireAdmin`/`requireSuperAdmin`) rather than copy-pasting a
fourth/fifth/sixth time. Also fixed a real, previously-undetected bug found while adding
these tests: the shared "collect zod field errors" pattern (used in five forms) kept the
_last_ failing validation message per field instead of the first, so a password failing
multiple checks (e.g. too short AND missing a symbol) displayed the least useful one;
extracted to `src/lib/zod-errors.ts`'s `fieldErrorsFromZod()` with first-message-wins
semantics and applied everywhere the old inline pattern existed. Test suite grew from 3
files/14 tests to 8 files/32 tests (added `ChangePasswordForm`, `ForgotPasswordForm`,
`CreateUserForm`, `CreateTenantForm`, `DeleteTenantButton` coverage) — also raised Jest's
per-test timeout (`jest.config.ts`) after observing real CPU-contention flakiness running
the full suite in parallel workers under WSL2.

Second pass, same day: tenant deletion UI (confirm dialog + `DELETE /api/tenants/[id]`),
the Figure 1 split-panel login screen (moved to `src/app/login/`, out of the `(auth)` route
group), a generated brand favicon (`src/app/icon.tsx`), and the first automated test suite.
Also fixed a real bug the favicon change introduced: `proxy.ts`'s matcher didn't exclude the
generated `/icon` route, so an unauthenticated visitor's favicon request was being
redirected to `/login`.

Earlier same-day: live end-to-end smoke test against a real backend (login, tenant +
first-Admin creation, subordinate-user creation, admin password reset, the forced
`mustChangePassword` flow, cookie rotation, role-gated route access — see the internship
report §3.8), and Super Admin tenant provisioning (`(dashboard)/tenants`, real
`POST`/`GET /tenants`).

## Auth & session

- [ ] Decide whether the CSRF Content-Type guard added to `POST /api/auth/login`
      (`src/app/api/auth/login/route.ts`) should be extended to the other mutating Route
      Handlers for defense-in-depth consistency, even though they're already protected by
      requiring the session cookie to pre-exist.

## User management (Admin)

`(dashboard)/users` now has the full action set: list, create, edit, change role, reset
password, delete (`UserRowActions`, self-targeting hidden client-side and rejected
server-side either way). Nothing left here — next work in this area is really about the
security modules (row-level alert actions, once a module exists) or deeper test coverage.

## Tenant management (Super Admin)

- [ ] Tenant detail view (currently list + create + delete; `GET /tenants/:id` is unused).

## Security modules (SIEM, SOAR, CTI, EDR, DFIR, VM)

- [ ] None of the six modules have real backend endpoints yet — this is the actual next
      phase of backend work, not a frontend gap per se. `(dashboard)/[module]/page.tsx` is a
      placeholder stub purely so the sidebar nav (matching Figure 2) doesn't 404.
- [ ] Once a module gets real backend endpoints, decide whether it replaces its slice of the
      generic `[module]/page.tsx` stub with a dedicated
      `src/app/(dashboard)/siem/`-style folder (recommended — the generic stub doesn't scale
      to real per-module data/actions).
- [ ] Row-level actions on the alerts table (assign/escalate/resolve) — intentionally not
      built with mock data/disabled buttons; needs a real SIEM module behind it first, at
      which point the Viewer role's read-only restriction on those actions should be added
      alongside them.

## Testing

8 files / 32 tests (`jest.config.ts`, `__tests__/`, `npm test`): `proxy.ts`'s full redirect
matrix, the login route's CSRF Content-Type guard, and every auth/user/tenant form's
validation/success/error paths (`LoginForm`, `ChangePasswordForm`, `ForgotPasswordForm`,
`CreateUserForm`, `CreateTenantForm`, `DeleteTenantButton`). Still missing, roughly in order
of value:

- [ ] `UserRowActions` — the four dialogs (edit/role/reset/delete) have no tests yet, unlike
      every other form in the app. Same pattern as the existing tests, just more surface
      area (four dialogs in one component) to cover.
- [ ] Route Handler tests beyond login's Content-Type guard — currently untested because
      `next/headers`' `cookies()` is request-scoped and throws outside a real request
      context; would need either a mocking strategy for `cookies()` or e2e tests (Playwright)
      against a real running instance instead of unit-testing the handlers directly.
- [ ] No e2e/Playwright setup — everything above is unit/component-level (Jest + RTL) only.
      The live curl-based smoke tests done this session (internship report §3.8) aren't
      automated/regression-proof; a Playwright suite against a real backend would be the
      next step up.
- [ ] Jest's default per-test timeout was raised to 15s (`jest.config.ts`) after observing
      real flakiness under WSL2 CPU contention when the full suite runs in parallel workers
      (a file that takes ~2s in isolation exceeded 5s under load, and a killed-mid-test
      `userEvent.type` call leaked keystrokes into the next test). Worth revisiting if the
      suite grows large enough that 15s stops being enough headroom, or if this turns out to
      be WSL2-specific and CI runs on different infrastructure.

## Polish / infra

- [ ] **No CI.** The backend has `.github/workflows/test.yml` running its suite on every
      push; the frontend's 32-test suite currently only runs when someone remembers to type
      `npm test`. Scoped out of the 2026-07-16 hygiene pass at the user's explicit direction,
      not forgotten — do this next if picking one item off this list.
- [ ] No Dockerfile on either side of the repo yet (docker-compose.yml is Postgres-only) —
      not a frontend-specific gap, noted for completeness.
- [ ] No husky/pre-commit hooks on either side — `format:check`/lint/typecheck only run
      manually or (once built) in CI, not before a commit lands locally.
- [ ] Resolve the TypeScript 6.0.3 (spec) vs 5.9.3 (installed) discrepancy — check whether
      6.x exists/is stable before deciding whether to force-upgrade or treat the spec as
      stale.
- [ ] `next-themes` is installed but unused (hard-coded `dark` class instead) — revisit only
      if a real light/dark toggle becomes a real requirement; the UI spec doesn't call for
      one today.
- [ ] The CSP (`next.config.ts`) uses `'unsafe-inline'`/`'unsafe-eval'` rather than a
      nonce-based policy — a deliberate simplification (nonces force every page into dynamic
      rendering) that's worth revisiting only if this app ever adds a real third-party script
      or starts accepting less-trusted rendered content. Re-verified via a live check that no
      pages, tests, or the build broke with the new headers in place before calling this
      done, not just written and assumed correct.
- [ ] Per-segment `loading.tsx` states — only a single root-level one exists
      (`src/app/loading.tsx`), which doesn't cover `(dashboard)/layout.tsx`'s own async
      `GET /users/me` fetch (a segment's `loading.tsx` wraps its `page.tsx`, not a sibling
      `layout.tsx` in the same segment).

# Working with this repo

- Same conventions as the backend: don't guess at root causes, verify against
  `node_modules/next/dist/docs/` or the actual generated file before assuming an API
  behaves like an older/more familiar version.
- The person driving this project is doing it to learn — when working here, prefer
  explaining tradeoffs and pointing at the relevant doc over silently picking an approach,
  unless explicitly asked to just implement something.
