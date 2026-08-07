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
    api/vm/assets/                                       — first proxyToBackend()-backed
                                                             route, see Phase 2 below; the
                                                             other five modules' routes land
                                                             in Phases 4-8, not built yet
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
    security/    — cross-module shared row-action components, added Phase 2 (2026-08-07):
                   NextOnlyPagination, AssignmentControl, StatusTransitionMenu — every
                   module page in Phases 3-8 reuses these instead of rebuilding row actions
                   per module
  lib/
    session.ts    — cookie read/write, getSession()/requireSession() (server-only)
    jwt.ts        — pure JWT payload decode, shared by session.ts and proxy.ts (no
                    "server-only", since proxy runs in a separate runtime that can't import
                    next/headers)
    backend.ts    — server-only fetch wrapper to the NestJS API: backendFetch,
                    backendFetchAuthed (refresh-capable, Route-Handler-only),
                    backendFetchAuthedNoRefresh (Server Components), refreshAccessToken,
                    applyRefreshCookie — see "Frontend auth architecture" above
    proxy-route.ts — proxyToBackend() (added Phase 2, 2026-08-07): the shared factory behind
                    every Route Handler under api/{vm,edr,siem,cti,soar,dfir,assets}/**
    query-filters.ts — buildQueryParams()/hasNextPage(), added Phase 2
    api-guards.ts — shared requireAdmin()/requireSuperAdmin()/requireAnalystOrAdmin()/
                    requireAuthenticated() fast-fail checks for Route Handlers (NOT the
                    security boundary — see the file's own doc comment)
    zod-errors.ts — fieldErrorsFromZod(): first-issue-per-field from a ZodError, used by
                    every form that shows inline field errors
    validations/  — zod schemas mirrored from backend DTOs (now incl. validations/vm.ts)
    mock-data.ts, severity.ts, nav.ts
  types/
    auth.ts       — UserRole, SessionClaims — hand-matched to backend/src/generated/prisma
    security.ts, vm.ts, edr.ts, siem.ts, cti.ts, soar.ts, dfir.ts, assets.ts — added Phase 2
                    (2026-08-07): enums, record types, and each module's
                    *_TRANSITIONABLE_STATUSES, hand-matched to backend/prisma/schema.prisma
  proxy.ts       — optimistic route protection (see below)
__tests__/       — Jest + RTL, root-level (not under src/) so it's never mistaken for a route
test-utils.ts    — shared mockJsonResponse()/fakeToken() helpers, also root-level: anything
                   placed inside
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

**Migrated 2026-08-07 (Phase 1 of the adaptation plan below, done).** The backend moved to
refresh-token rotation, a 15 minute access token, and account lockout on 2026-08-05/06 (see
`backend/CLAUDE.md`'s "Auth: refresh token rotation & logout" and "Auth: account lockout and
password reuse prevention" sections); the frontend now matches it. See "Recently completed"
in the functionality backlog below for the full change log and what was found along the way
(a real backend bug: `users.module.ts` was still signing the post-password-change token with
a stale 1h expiry, fixed as part of this pass). Module work (Phase 3 onward) can now proceed.

The backend is stateless-JWT-plus-refresh-cookie: a 15 minute `Authorization: Bearer <token>`
access token (`JwtModule.register({ signOptions: { expiresIn: '15m' } })` in both
`auth.module.ts` and `users.module.ts`), and a longer-lived `refresh_token` httpOnly cookie
(`Path=/api/auth`, rotated on every use, family-killed on reuse) that the backend sets
directly — see `backend/src/auth/auth.controller.ts`. The frontend wraps the access token in
a small BFF (backend-for-frontend) layer instead of having client-side JS hold it directly,
and now also relays the backend's refresh cookie so the browser can hold it too (the
`refresh_token` cookie's `Path=/api/auth` lines up with the frontend's own auth routes,
which is why the browser attaches it there automatically):

1. **The browser never sees the raw JWT.** `POST /api/auth/login` (a Next.js Route
   Handler, `src/app/api/auth/login/route.ts`) calls the real backend, then stores the
   `access_token` in an **httpOnly** cookie (`secops_token`, `src/lib/session.ts`) and
   relays the backend's rotated `refresh_token` cookie back to the browser (see
   `src/lib/backend.ts`'s `applyRefreshCookie`). Every other mutation that needs the access
   token (`change-password`, `create user`) goes through its own Route Handler that reads
   the cookie server-side and attaches `Authorization: Bearer <token>` — see
   `src/lib/backend.ts`'s `backendFetchAuthed`. `login/route.ts` also rejects any request
   whose `Content-Type` isn't `application/json` before parsing the body — found by
   `/security-review`: without it, a cross-site page could reach this one route with no CORS
   preflight (`mode: "no-cors"` + `Content-Type: text/plain`, since `Request.json()` ignores
   the declared type) and plant an attacker-controlled session in a victim's browser (login
   CSRF). Every other mutating route is already safe by construction — they require the
   cookie to pre-exist, and `SameSite=Lax` keeps it off cross-site requests; login (and now
   `refresh`, though its precondition is the `refresh_token` cookie rather than a body) are
   the routes that don't need a pre-existing session cookie themselves.
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
     stale). Admin-only pages additionally check `session.role` and redirect. It also
     redirects to `/change-password` when `session.mustChangePassword` is true (an
     `{ allowMustChangePassword: true }` param lets `/change-password` itself opt out, since
     it has to stay reachable) — this was a real gap until 2026-07-28: `proxy.ts` checked the
     flag but `requireSession()` didn't, so the two layers weren't actually redundant for this
     one check. See `docs/superpowers/specs/2026-07-28-password-change-request-flow-design.md`.
   - Underneath both of those, the **backend's own guards are the actual authorization
     boundary** (`JwtAuthGuard`, `RolesGuard`, `MustChangePasswordGuard` — see
     `backend/CLAUDE.md`). Nothing on the frontend is a substitute for those; they're UX
     polish (don't flash protected UI, give a nice error) on top of a backend that already
     enforces this server-side regardless of what the frontend does.
4. **Cookie lifetime matches the access token** (`SESSION_MAX_AGE_SECONDS = 900`, i.e. 15
   minutes) — but unlike the pre-2026-08-07 design, the session doesn't just silently expire
   at that point anymore. `src/lib/backend.ts`'s `backendFetchAuthed` retries once through
   `refreshAccessToken()` on a 401, using the browser's `refresh_token` cookie to mint a new
   15-minute access token (and a rotated `refresh_token`) transparently. A session now only
   actually ends when the refresh token itself is rejected (expired, or its family was
   killed by reuse detection) — that's when a request finally 401s all the way through and
   the next navigation's `requireSession()`/`proxy.ts` redirect to `/login` takes over.
5. **The refresh-capable `backendFetchAuthed` is Route-Handler-only — Server Components use
   `backendFetchAuthedNoRefresh` instead.** Found during Phase 1 implementation, not in the
   original plan: `next/headers`' `cookies().set()` throws when called during Server
   Component rendering (Next's own docs, "Understanding Cookie Behavior in Server
   Components"), and the danger isn't just the throw — the backend rotates (invalidates) the
   *old* refresh token the instant it receives a `POST /auth/refresh` request, regardless of
   whether the frontend can persist the new one afterward. A Server Component that triggered
   a refresh it couldn't persist would leave the browser holding an already-dead refresh
   token, which would trip the backend's reuse-detection and kill the whole token family on
   the next real attempt. The four Server Component pages that read backend data directly
   during render (`(dashboard)/dashboard`, `(dashboard)/layout.tsx`,
   `(dashboard)/tenants[/[id]]`, `(dashboard)/users`) use `backendFetchAuthedNoRefresh` —
   same shape, no refresh attempt, a 401 just propagates. This is safe because
   `requireSession()` already redirects once the access token's own `exp` has passed, before
   any of these calls run in the same request — a 401 reaching one of them is a genuine
   backend rejection, not an expired-token case a refresh would fix. **This matters for
   Phase 3 onward:** any new server-component module page that fetches backend data directly
   during render must use `backendFetchAuthedNoRefresh`, not `backendFetchAuthed` — see
   decision 3 in the adaptation plan below, which assumed the opposite before this was found.

If a future session wants to change this further (e.g., proactive refresh, NextAuth/an auth
library), that's a real architecture change — flag it explicitly rather than quietly
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
- **There is no voluntary self-service password change once logged in, by design (2026-07-28).**
  `(auth)/change-password` only shows the real change form (`ChangePasswordForm`) while
  `session.mustChangePassword` is true — the mandatory first-time change. Otherwise it shows
  `RequestPasswordChangeForm`, which doesn't touch the password at all; it just flags the
  account (`POST /api/users/me/request-password-change`) for the tenant's first-created
  Admin to notice (or Super Admins, if that first Admin is the one requesting). Don't add a
  "change your password" settings form back without re-reading
  `docs/superpowers/specs/2026-07-28-password-change-request-flow-design.md` first — this
  was a deliberate security decision, not an oversight.
- **Super Admin has no `/users/me`-equivalent.** `GET /users/me` throws
  `ForbiddenException` for accounts with no `tenantId`. The dashboard layout
  (`src/app/(dashboard)/layout.tsx`) falls back to JWT claims only for that role — there's
  currently no backend endpoint for a Super Admin to fetch their own profile. (Tenant data
  itself is real now — `src/app/(dashboard)/tenants/page.tsx` + `src/app/api/tenants/`
  wire up `GET`/`POST /tenants`, and the dashboard's `SuperAdminOverview` pulls the same
  real list instead of mock data. Tenant _deletion_ — `DELETE /tenants/:id` exists on the
  backend — has no UI yet.)
- **Dashboard content is mock data** (`src/lib/mock-data.ts`). This was accurate when
  written, but as of 2026-08-06 **all six modules (SIEM, SOAR, CTI, EDR, DFIR, VM) plus an
  asset aggregator and an SSE event stream are fully built on the backend** (see
  `backend/CLAUDE.md`'s module implementation plan, all phases checked). Nothing on the
  frontend has been adapted to consume them yet. `mock-data.ts`, the `[module]/page.tsx`
  stub, and this bullet are all now stale in the same way. Full replacement plan is in the
  adaptation plan further down this file, do not silently keep extending `mock-data.ts`.
- **No row-level actions on the alerts table** (assign/escalate/resolve) — intentionally
  not faked with disabled buttons. See the adaptation plan below, this is now buildable for
  real (SIEM's assign/status routes exist), no longer blocked on a missing backend module.
- ~~Admin can list/create users but not yet edit/delete/reset-password/change-role from
  the UI~~ **No longer true, this bullet was stale.** The full action set landed the same
  day this file's "Known gaps" section was last written (see the "Third pass" entry under
  "Recently completed" below) and this bullet was never removed afterward, contradicting
  that entry. Left struck through rather than deleted so the drift is visible; corrected
  2026-08-06 while auditing this file against the backend for the adaptation plan below.
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
- **Every module's `query()` (VM, EDR, SIEM, CTI, SOAR, DFIR) and `AssetService.
  getUnifiedFeed` return a bare array, with no total count**, unlike `GET /users` which
  returns `{ users, total, page, pageSize }`. Verified directly against
  `backend/src/**/*.service.ts`: only `UsersService.findAllForTenant` runs a `$transaction`
  alongside a `count()`. This is a real backend limitation, not something the frontend can
  work around alone, plan pagination UI for these list pages accordingly (see the
  adaptation plan below, "shared foundation" phase).

# Functionality backlog (what's still to build)

Full narrative of what's done and why lives in `docs/internship-report-frontend.md`. This
section is the working checklist — organized by area, not just priority order, so it's easy
to see what's missing in a given part of the app. Update it as items land; don't let it
drift from reality.

**Recently completed** (2026-08-07, eighth pass — Phase 2 shared foundation): the
scaffolding every module page in Phases 3-8 will build on — see Phase 2 of the adaptation
plan below for the full checklist. Highlights: `src/types/{security,vm,edr,siem,cti,soar,
dfir,assets}.ts` (enums, record types, `*_TRANSITIONABLE_STATUSES` constants), `src/lib/
severity.ts` reworked to the real uppercase `Severity` (breaking `mock-data.ts`'s casing
along with it, on purpose), `src/lib/query-filters.ts` (`buildQueryParams`/`hasNextPage`),
`src/components/security/next-only-pagination.tsx`, `src/lib/proxy-route.ts`'s
`proxyToBackend()` (proven against a real `src/app/api/vm/assets/route.ts`), and
`src/components/security/{assignment-control,status-transition-menu}.tsx`. One real bug
caught immediately by building a real route against the new helper (exactly the reason
decision 6 says to prove it first): an untyped `<Select>` with no `value` prop couldn't
infer its generic, failing `tsc` — fixed with an explicit `<Select<string>>` before it could
repeat across the other ~35 routes. Test suite grew from 110 to 143 tests, all green;
`tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all verified clean.

**Recently completed** (2026-08-07, seventh pass — Phase 1 auth migration): full refresh-token
migration matching the backend's 2026-08-05/06 changes (see "Frontend auth architecture"
above and Phase 1 of the adaptation plan below for the complete checklist). Highlights: new
`POST /api/auth/refresh` Route Handler; `login`/`logout` now relay/consume the backend's
`refresh_token` cookie; `backendFetchAuthed` retries once through a lazy refresh on a 401;
`SESSION_MAX_AGE_SECONDS` dropped from 1h to 15m to match the backend's real access-token
lifetime. Two things found and fixed along the way that weren't in the original plan: (1) a
real backend bug — `users.module.ts`'s own `JwtModule` registration, used to re-sign the
access token right after the mandatory first-login password change, was still hardcoded to
`expiresIn: '1h'`, silently outliving every other token by 4x; fixed to `15m`. (2) a
Server-Component-safety gap in the plan itself — `cookies().set()` can't run during Server
Component rendering, so the four pages that fetch backend data directly during render
(`dashboard`, dashboard `layout.tsx`, `tenants[/[id]]`, `users`) would have thrown on any
401 that reached the new refresh-capable `backendFetchAuthed`; split into
`backendFetchAuthed` (Route Handlers) and `backendFetchAuthedNoRefresh` (Server Components)
and moved those four call sites, correcting decision 3 of the adaptation plan for Phase 3
onward. Test suite grew from 97 to 110 tests (new `__tests__/auth-token-refresh.test.ts`,
15 tests), all green; `tsc --noEmit`, `eslint`, and `next build` all verified clean.
`__tests__/` is still `.gitignore`d (see the Testing backlog below) — not fixed as part of
this pass, still the top item there.

**Recently completed** (2026-07-28, sixth pass — password-change enforcement + request
flow): found and fixed a real backend bug while investigating a reported "new users aren't
forced to change their password" symptom — `UsersService.createUser` and
`TenantsService.createTenantWithAdmin` never set `mustChangePassword: true`, relying on the
Prisma column default instead, so no new account (first Admin, co-Admin, Analyst, Viewer) was
ever actually forced through the change flow. Fixed at the source. Also closed a real gap in
this file's own "two redundant layers" claim: `requireSession()` didn't check
`mustChangePassword` even though `proxy.ts` did — it does now (`{ allowMustChangePassword }`
param). Removed voluntary self-service password change for every role (Admins included) once
past the mandatory first-time change; replaced with a request flow
(`RequestPasswordChangeForm` → `POST /api/users/me/request-password-change`) that notifies a
single designated recipient per tenant (the first-created Admin, or Super Admins if that
Admin is the one requesting) via a new red-dot indicator on the sidebar's Users/Tenants nav
link (`GET /api/users/me/pending-password-requests`, polled by `(dashboard)/layout.tsx`).
Full design and verification log in
`docs/superpowers/specs/2026-07-28-password-change-request-flow-design.md`. Test suite grew
from 94 to 97 tests, all green; backend's grew too (see `backend/CLAUDE.md`). Note: `__tests__/`
is currently `.gitignore`d in this repo (found while running the suite for this pass) — the
97 tests exist locally but aren't tracked in git, so CI or a fresh clone would see zero. Not
fixed as part of this pass since it wasn't part of the request; flagged here so it isn't lost.

**Recently completed** (2026-07-23, fifth pass — a codebase-reading session that turned into
a fix-then-build pass): three gaps found while reading the code with fresh eyes — `POST
/api/auth/forgot-password` got the same CSRF Content-Type guard as `login` (same no-preflight
exposure, lower blast radius since it only flags `passwordResetRequestedAt`, not a planted
session); `UserRowActions`' four dialogs and every Route Handler under `/api/users/**` and
`/api/tenants/**` went from zero tests to full coverage, using a `next/headers` `cookies()`
mock (`jest.mock("next/headers", ...)` + a fake unsigned JWT via `fakeToken()` in
`test-utils.ts`) — the mocking strategy the "Testing" backlog below said was needed; and
`GET /users` gained real pagination (`page`/`pageSize` query params, `{ users, total, page,
pageSize }` response shape, `(dashboard)/users` got Previous/Next controls) since it had none
before. Then three linked features: Admins now see a "Password reset requested" badge + amber
row tint on any tenant user (including a co-Admin) with a pending `passwordResetRequestedAt`
in `(dashboard)/users`; Super Admins get a real tenant detail page
(`(dashboard)/tenants/[id]`, closing the "tenant detail view" gap below) listing that
tenant's Admins with the same badge/tint; and a new backend capability,
`UsersService.resetSoleAdminPassword`, lets a Super Admin reset an Admin's password but only
when that Admin has no co-Admin in their tenant to do it instead (`POST
/users/:id/reset-password` now accepts `SUPER_ADMIN` too, added to
`backend/CLAUDE.md`'s hard-rules list) — when there's a co-Admin, the existing in-tenant
reset (already visible via the same badge) is expected to handle it. Test suite grew from
8 files/32 tests to 17 files/94 tests on the frontend; the backend gained matching coverage
for `findAllForTenant`'s pagination, `TenantsService.findById`'s admin list, and
`resetSoleAdminPassword`'s sole-Admin/co-Admin/not-an-Admin branches.

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

`POST /api/auth/login` and `POST /api/auth/forgot-password` — the two routes with no
pre-existing-cookie precondition — both have the CSRF Content-Type guard now. Every other
mutating route is still covered by the "cookie must already exist" + `SameSite=Lax`
reasoning in the architecture section above; revisit only if a route is ever added that,
like these two, doesn't require a pre-existing session.

Backend note (2026-08-07, no frontend change needed): `LoginDto.email` is now
trimmed/lowercased server-side the same way `CreateUserDto.email` already was, closing a gap
where a user whose account was created with mixed-case-normalized storage could fail to log
in on casing alone. Purely a backend fix — the frontend already just forwards whatever the
login form's zod schema validates as a well-formed email, nothing to change here.

Refresh-token migration: **done, 2026-08-07.** See Phase 1 of the adaptation plan below for
the full checklist and what was found along the way; see "Frontend auth architecture" above
for the resulting design.

## User management (Admin)

`(dashboard)/users` now has the full action set: list, create, edit, change role, reset
password, delete (`UserRowActions`, self-targeting hidden client-side and rejected
server-side either way). Users created here now always come back with
`mustChangePassword: true` (backend fix, 2026-07-28 — see the "Recently completed" entry
above). Sidebar's Users link (Admin) / Tenants link (Super Admin) shows a red dot when
`GET /users/me/pending-password-requests` returns `hasPending: true` — one designated
recipient per tenant, not a broadcast; see `backend/CLAUDE.md`'s hard-rules list for the
exact targeting rule. Nothing left here on its own terms, next work in this area is the
security-module adaptation plan below, which reuses this section's row-actions pattern
(`UserRowActions`) as the template for every module's assign/unassign/status controls.

## Tenant management (Super Admin)

`(dashboard)/tenants/[id]` is now a real detail page — `GET /tenants/:id` returns the
tenant's Admins too (`TenantsService.findById`'s `include: { users: { where: { role:
ADMIN } } }`), rendered via `TenantAdminsTable` with the same pending-reset badge/tint as
`(dashboard)/users`, plus a reset-password action that only appears when the tenant has
exactly one Admin (see `ResetAdminPasswordButton` and `UsersService.resetSoleAdminPassword`
on the backend). Nothing outstanding for what was built.

- [ ] **`PATCH /tenants/:id` (rename) has no UI.** Backend route exists, nothing calls it.
      Full plan is Phase 11 of the adaptation plan below.
- [ ] **`TenantModule` CRUD (`GET/POST/PATCH/DELETE /tenants/:id/modules[/:moduleName]`)
      has no UI at all.** This is the actual "which modules is this tenant subscribed to"
      activation surface described in root `../CLAUDE.md`, and until it's built, every
      tenant created through the real API has zero active modules (see
      `backend/CLAUDE.md`'s "Full completeness scan" entry, finding 1). Full plan is
      Phase 11 below.

## Security modules, asset feed, and real-time delivery (SIEM, SOAR, CTI, EDR, DFIR, VM)

**All six modules, the asset aggregator, and the SSE event stream are fully built on the
backend as of 2026-08-06** (see `backend/CLAUDE.md`'s module implementation plan, every
phase checked). Nothing on the frontend consumes any of it yet: `(dashboard)/[module]/page.tsx`
is still the placeholder stub, `src/lib/mock-data.ts` still backs the dashboard, and there is
no Route Handler, page, or type anywhere under `src/` for any of `vm`, `edr`, `siem`, `cti`,
`soar`, `dfir`, `assets`, or `events`. This is the single largest remaining gap between the
two halves of this repository. Full phased plan, decisions, and verified API contract are in
the dedicated section below, "Backend to frontend adaptation plan (2026-08-06)". Do not
re-derive the backend route list by hand when picking up this work, the plan already has it
verified against the actual controller source, re-verify only if the backend has changed
since 2026-08-06.

## Testing

24 files / 143 tests (`jest.config.ts`, `__tests__/`, `npm test`): `proxy.ts`'s full redirect
matrix, every auth/user/tenant form's validation/success/error paths (incl.
`RequestPasswordChangeForm`, added 2026-07-28), `UserRowActions`' four dialogs,
`UsersTable`/`TenantAdminsTable`'s pending-reset badge/tint logic, `ResetAdminPasswordButton`,
the full refresh-token migration (`auth-token-refresh.test.ts`, added 2026-08-07 —
`refreshAccessToken()`, `backendFetchAuthed`'s retry-on-401, and the login/refresh/logout
Route Handlers' cookie relay), Phase 2's shared foundation (`vm-assets-route.test.ts`,
`query-filters.test.ts`, `next-only-pagination.test.tsx`, `assignment-control.test.tsx`,
`status-transition-menu.test.tsx`, added 2026-08-07), and — the gap called out below in
earlier passes — every
Route Handler under `/api/users/**` and `/api/tenants/**`, using a `jest.mock("next/headers")`
cookie-store mock plus `fakeToken()` (in `test-utils.ts`) to build a syntactically valid
unsigned JWT for the session cookie (see `src/lib/jwt.ts`'s doc comment for why an unsigned
token is safe to use in tests — this file never verifies signatures either). **`__tests__/`
is currently
`.gitignore`d** — these tests run and pass locally but aren't tracked in git; a fresh clone
or CI would see zero test files. Found 2026-07-28, not yet fixed. Still missing, roughly in
order of value:

- [ ] Fix `__tests__/` being gitignored (see above) — probably the single highest-value item
      on this list now, since it makes every count in this section describe tests nobody but
      the person who wrote them can actually run.
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
- [ ] Once the adaptation plan below lands, the test count needs to grow proportionally.
      Forty-plus new backend routes across six modules plus the asset feed, each needing at
      minimum a Route Handler success/error/RBAC test, would roughly double or triple the
      current suite on its own, before counting form and row-action component tests. Track
      this as a real, sized cost, not an afterthought per phase.

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

# Backend to frontend adaptation plan (2026-08-06)

Written after a full comparison of this file against `backend/CLAUDE.md` and the actual
backend source (every controller's route decorators, every DTO, and `prisma/schema.prisma`
were read directly for this pass, not assumed from prior notes). The backend has grown far
past what this file described: refresh-token rotation, account lockout, and all six security
modules plus an asset aggregator and an SSE stream landed between 2026-08-04 and 2026-08-06,
none of which this file or the actual frontend code had caught up to. This section is the
full task list to close that gap.

**How to use this section.** Same convention as `backend/CLAUDE.md`'s own module
implementation plan: one unchecked item is roughly one session's worth of work. Work phases
in order, they build on each other (shared types and the auth migration have to exist before
a module page can be built against them). Check a box only once it is actually built and
verified, not just attempted. Update this plan as reality diverges from it, do not let it
drift the way the old three-bullet stub it replaces did.

## Decisions made while writing this plan (confirm or override before starting, do not
silently accept)

These are genuine design choices with tradeoffs, not the only way to build this. Each is
recorded with its reasoning so a future session can revisit deliberately instead of guessing
why something was built a certain way.

1. **The refresh-token relay stays inside the existing Route Handler pattern, it does not
   switch to Next.js `rewrites()`.** A transparent rewrite proxy would make `SameSite=Lax`
   work correctly for free (the browser would see the auth routes as same-origin), but it
   would also bypass every Route Handler currently doing real work on these paths: zod
   validation, the login CSRF Content-Type guard, and `firstErrorMessage()` error
   normalization. Keeping the Route Handler pattern means the frontend has to manually relay
   the backend's `Set-Cookie` header for `refresh_token` instead of getting that for free.
   That relay work is real and is scoped explicitly in Phase 1 below. Revisit this choice
   only if the manual relay turns out to be fighting the framework harder than expected.
2. **Access token storage does not change.** It stays in the httpOnly `secops_token` cookie
   set by the frontend's own Route Handlers, the browser still never sees the raw JWT. Only
   its lifetime changes (1h to 15m, matching the backend) and a refresh path gets added
   behind it. This preserves the existing "no signature verification on the frontend, on
   purpose" reasoning and the existing two-layer route protection design, neither of which
   the backend's auth change actually invalidates.
3. **Token refresh is triggered lazily, on a 401 from `backendFetchAuthed`, not proactively
   on a timer.** ~~This app is server-rendered for almost every data fetch (every module
   page planned below is a server component calling `backendFetchAuthed` directly)~~ —
   **corrected during Phase 1 implementation (2026-08-07):** server components must call
   `backendFetchAuthedNoRefresh` instead, not the refresh-capable `backendFetchAuthed` —
   `cookies().set()` can't run during Server Component rendering, and attempting the refresh
   anyway would burn the browser's refresh token without being able to persist its
   replacement. See point 5 in the "Frontend auth architecture" section above for the full
   reasoning; every module page in Phases 3-8 below needs to use the No-Refresh variant for
   its data-fetching Server Component, same as the four existing pages already do. Route
   Handlers (mutations, and any page that fetches through one) still get the real lazy
   refresh, so "a fresh access token check happens on effectively every navigation" still
   holds — it just happens one layer differently than originally assumed. A proactive
   client-side refresh timer would only matter for the SSE connection and any future
   client-heavy page that stays mounted for more than 15 minutes without a server round
   trip. Scoped explicitly as a Phase 10 (SSE) concern, not built everywhere by default.
4. **New shared types live in `src/types/security.ts`, mirroring the backend's Prisma
   enums, plus one file per module under a new `src/types/` split if a single file gets too
   large.** Follows the existing precedent set by `src/types/auth.ts` (hand-mirrored `as
   const` object plus derived type, re-verify against `backend/prisma/schema.prisma` if it
   ever looks stale) rather than introducing a codegen step, same "no shared types package"
   tradeoff already accepted for the rest of this API contract.
5. **Severity casing changes from the mock data's lowercase (`"critical"`) to the backend's
   real uppercase enum (`CRITICAL`) everywhere real data is involved.** `src/lib/severity.ts`
   currently keys off the mock `Severity` type. This is a breaking change to that file's
   exported map keys, not just an addition, planned explicitly in Phase 2 rather than
   letting two casings coexist.
6. **One Route Handler per backend route, generated through a small shared proxy helper, not
   forty-plus hand-written near-duplicates.** The six modules add roughly 40 new backend
   routes between them (see the verified route inventory in Phase 2). Hand-writing a
   `route.ts` per route the way `api/users/**` was built would work but is a lot of
   repeated boilerplate (zod validation, `requireAdmin`/`requireAnalystOrAdmin`-style guard,
   `backendFetchAuthed` call, error normalization). Phase 2 below plans a shared
   `proxyToBackend()` helper, parameterized by path, method, an optional zod schema, and an
   optional role guard, called from a thin `route.ts` per route. This is the same
   "extract the repeated pattern once" instinct already applied to `src/lib/api-guards.ts`.
7. **No manual "send a test event" form for any module's `POST /<module>/events` route.**
   Those routes are Admin-gated as a deliberate stand-in for a machine caller that does not
   exist yet (see `backend/CLAUDE.md`'s module plan, decision 7). Building a UI form for them
   would be building a fake integration for a route whose entire reason for existing is to be
   replaced by a real vendor webhook or API key later. Explicitly out of scope, not an
   oversight, matches the backend's own "don't build fake real automation" discipline applied
   to SOAR execution.
8. **Per-record detail pages are built only where the backend has a dedicated detail
   endpoint.** That is `GET /dfir/incidents/:id` alone, none of the other five modules have
   one. Everywhere else, a slide-over/drawer sourced from the already-fetched list row is
   used instead of inventing a client-side "detail view" that just re-renders data the list
   call already returned. Keeps the frontend from silently pretending to have more backend
   surface than it does.
9. **Pagination on the six module list pages and the asset feed is "Next enabled while the
   last page was full," not page-count-aware.** Every one of these endpoints returns a bare
   array with no total count (verified directly against the service methods, see the "Known
   gaps" bullet above this section). A "Page 3 of 9" style control the way `(dashboard)/users`
   has is not honestly buildable without a backend change. If total counts become valuable
   enough to justify it, that is a backend task (mirroring `UsersService.findAllForTenant`'s
   `$transaction` plus `count()` pattern) to raise separately, not something to fake
   client-side by fetching every page to count rows.
10. **The Security Overview dashboard's four mock KPIs (`criticalAlerts`, `highAlerts`,
    `openIncidents`, `resolvedToday`) do not map onto any single backend endpoint.** Computing
    them for real means either several small aggregate queries or client-side counting over
    `GET /assets/feed` results, both are real design work, not a trivial mock-to-real swap.
    Scoped explicitly in Phase 9, do not assume this is a quick find-and-replace.

## Verified backend route inventory (2026-08-06, re-verified 2026-08-07 — re-verify again if this looks stale)

Read directly from each controller's decorators, not carried over from memory. `Roles` shown
is the `@Roles(...)` decorator on that specific route or its controller class; no `@Roles`
at all means any authenticated tenant role (Admin, Analyst, Viewer) can call it, per the
backend's own RBAC default (decision 9 in its module plan).

**2026-08-07 backend hardening pass — no new routes, but two response-shape changes that
matter once the corresponding phases below get built** (full detail in
`backend/CLAUDE.md`, this is the frontend-relevant summary only; everything else from that
pass — refresh-token race, atomic lockout counter, polling resilience, the build-hang fix,
CTI's internal match logic — is backend-internal and needs no frontend change):

- **`POST .../assign` on SIEM, EDR, and DFIR now returns `409 Conflict`** if the target
  record is already `RESOLVED` (SIEM/EDR) or `CONTAINED`/`RESOLVED` (DFIR), instead of
  silently reopening it. The error body is a normal Nest `ConflictException` shape, so
  `firstErrorMessage()` (`src/lib/backend.ts`) already handles it like any other backend
  `409` — no special-casing needed, just don't assume assign always succeeds when planning
  `AssignmentControl`'s error states (Phase 2, Phase 4, Phase 5, Phase 8 below). **VM's
  `POST vulnerabilities/:id/assign` is unaffected** — VM's assign never touched a status
  field to begin with, so there was nothing to guard.
- **`POST /dfir/incidents/:id/links` is now idempotent on retry**: linking the same
  `(incidentId, sourceType, sourceId)` twice returns the existing link instead of creating a
  second, indistinguishable row. Relevant to Phase 8's "link an existing record" form — a
  double-submit (e.g. a slow network causing a retry) is now safe by itself, no client-side
  debounce/guard required to avoid duplicate links.

- **Auth** (`/auth`): `POST login` (public), `POST refresh` (public, reads/sets the
  `refresh_token` cookie), `POST logout` (any role, `@SkipPasswordCheck()`), `POST
  forgot-password` (public).
- **Users** (`/users`): `GET me`, `PATCH me/password`, `POST me/request-password-change`,
  `GET me/pending-password-requests` (Admin, Super Admin), `POST` (Admin), `GET` (Admin),
  `GET :id` (Admin), `PATCH :id` (Admin), `PATCH :id/role` (Admin), `POST
  :id/reset-password` (Admin, Super Admin), `DELETE :id` (Admin). All already wired on the
  frontend, see "User management" above.
- **Tenants** (`/tenants`, class-level Super Admin): `POST`, `GET`, `GET :id`, `PATCH :id`
  (rename, **no frontend**), `DELETE :id`, `GET :id/modules` (**no frontend**), `POST
  :id/modules` (**no frontend**), `PATCH :id/modules/:moduleName` (**no frontend**),
  `DELETE :id/modules/:moduleName` (**no frontend**).
- **VM** (`/vm`): `GET assets`, `POST assets` (Admin, Analyst), `PATCH assets/:id` (Admin,
  Analyst), `DELETE assets/:id` (Admin, Analyst), `GET vulnerabilities`, `PATCH
  vulnerabilities/:id/status` (Admin, Analyst), `POST vulnerabilities/:id/assign` (Admin,
  Analyst), `DELETE vulnerabilities/:id/assign` (Admin, Analyst), `POST events` (Admin, out
  of scope per decision 7 above). **No frontend at all.**
- **EDR** (`/edr`): `GET endpoints`, `PATCH endpoints/:id` (Admin, Analyst), `DELETE
  endpoints/:id` (Admin, Analyst), `GET detections`, `POST detections/:id/assign` (Admin,
  Analyst), `DELETE detections/:id/assign` (Admin, Analyst), `PATCH detections/:id/status`
  (Admin, Analyst), `POST events` (Admin, out of scope). No manual endpoint-create route
  exists, endpoints only ever appear via `ingest()`'s upsert. **No frontend at all.**
- **SIEM** (`/siem`): `GET logs`, `GET alerts`, `POST alerts/:id/assign` (Admin, Analyst),
  `DELETE alerts/:id/assign` (Admin, Analyst), `PATCH alerts/:id/status` (Admin, Analyst),
  `POST events` (Admin, out of scope). **No frontend at all**, this is the module the
  current mock alerts table is a stand-in for.
- **CTI** (`/cti`): `GET iocs`, `POST iocs` (Admin, Analyst), `PATCH iocs/:id` (Admin,
  Analyst), `DELETE iocs/:id` (Admin, Analyst), `POST events` (Admin, out of scope). **No
  frontend at all.**
- **SOAR** (`/soar`): `GET playbooks`, `POST playbooks` (Admin), `PATCH playbooks/:id`
  (Admin), `DELETE playbooks/:id` (Admin), `GET executions`. **No frontend at all.**
- **DFIR** (`/dfir`): `GET incidents`, `GET incidents/:id` (the one module with a detail
  endpoint, see decision 8 above), `POST incidents/:id/assign` (Admin, Analyst), `DELETE
  incidents/:id/assign` (Admin, Analyst), `PATCH incidents/:id/status` (Admin, Analyst),
  `POST incidents/:id/links` (Admin, Analyst), `DELETE incidents/:id/links/:linkId` (Admin,
  Analyst). **No frontend at all.**
- **Assets** (`/assets`): `GET feed`. **No frontend at all.**
- **Events** (`/events`): `GET stream` (`@Sse`, requires a valid access token like any other
  authenticated route, the browser's native `EventSource` cannot attach an `Authorization`
  header, this is why Phase 10 below needs a Route Handler proxy, not a direct browser
  connection). **No frontend at all.**

## Phase 1, auth migration (blocking, do this before any module work) — DONE 2026-08-07

- [x] Update `src/lib/session.ts`: `SESSION_MAX_AGE_SECONDS` from `60 * 60` to `15 * 60`
      (matching the backend's new access token lifetime), and correct the file's own comment
      claiming "no refresh tokens exist in this API."
- [x] Add cookie relay helpers to `src/lib/backend.ts`: `getRefreshToken()` (reads the
      browser's own `refresh_token` cookie via `next/headers`, for forwarding to the backend
      on refresh/logout) and `applyRefreshCookie()` (parses the `refresh_token=...`
      `Set-Cookie` header off a backend auth response via `Headers.getSetCookie()` — verified
      available on this project's Node 22 runtime — and re-applies it via `cookies().set()`
      rather than a raw header copy, since `cookies().set()` is the only mechanism that also
      works from inside `backendFetchAuthed`'s retry path, which doesn't hold a `NextResponse`
      object of its own; see decision 1 above for why the relay is manual in the first place).
- [x] New `src/app/api/auth/refresh/route.ts`, backed by `src/lib/backend.ts`'s
      `refreshAccessToken()` (shared with `backendFetchAuthed`'s retry path rather than the
      route re-implementing the logic or self-calling over HTTP): reads the browser's
      `refresh_token` cookie, forwards it to the backend's `POST /auth/refresh` as a `Cookie`
      header, relays the rotated `refresh_token` back to the browser, and updates the
      `secops_token` session cookie from the response body's `access_token`. No CSRF
      Content-Type guard needed (no body, and it's already safe-by-construction like every
      other cookie-precondition route — see the route's own comment).
- [x] `src/app/api/auth/login/route.ts` now relays the backend's `refresh_token` `Set-Cookie`
      via the same `applyRefreshCookie()`.
- [x] `src/app/api/auth/logout/route.ts` now calls the backend's `POST /auth/logout`
      (forwarding both the access token and the `refresh_token` cookie) before clearing local
      cookies — best-effort single attempt via `backendFetch` (not `backendFetchAuthed`,
      deliberately, to avoid double-spending the refresh token through a lazy-refresh retry
      mid-logout; see the route's own comment). Local cookies clear either way, even if the
      backend call throws.
- [x] Wired the lazy refresh-on-401 behavior into `backendFetchAuthed` per decision 3 above:
      on a 401, calls `refreshAccessToken()` once, retries the original request once with the
      new token, and only then propagates a 401 to the caller. An `isRetry` flag (internal,
      never passed by call sites) guards against a second consecutive 401 triggering a second
      refresh attempt. **Real finding made while implementing this, not in the original
      plan:** this refresh-capable version is unsafe to call from a Server Component (see
      point 5 in "Frontend auth architecture" above and decision 3's correction below) — split
      into `backendFetchAuthed` (Route Handlers) and a new `backendFetchAuthedNoRefresh`
      (Server Components), and moved the four existing Server-Component call sites
      (`(dashboard)/dashboard`, `(dashboard)/layout.tsx`, `(dashboard)/tenants[/[id]]`,
      `(dashboard)/users`) to the No-Refresh variant. This also fixed a latent, harmless-until-now
      doc/implementation mismatch: `backend.ts`'s own comment already claimed Route Handlers
      were the only allowed caller, but these four pages called the (then non-refreshing)
      `backendFetchAuthed` directly.
- [x] Confirmed account lockout needs no frontend change (re-verified against
      `auth.service.ts` directly): the backend returns an identical generic message whether
      the account does not exist, the password is wrong, or the account is currently locked.
      No distinguishing client-side message added.
- [x] Updated `src/lib/session.ts`'s comment (was already the only one referencing "no
      refresh tokens"/a 1 hour lifetime — `src/proxy.ts` never made that claim itself, nothing
      to change there).
- [x] Tests: `__tests__/auth-token-refresh.test.ts` (new, 15 tests) covers
      `refreshAccessToken()` (no cookie / backend rejection / success-rotates-both-cookies),
      `backendFetchAuthed`'s retry-once-then-propagate and no-second-refresh-on-second-401
      behavior, `POST /api/auth/refresh`, `POST /api/auth/logout` (forwards both tokens /
      still clears cookies on a backend failure / skips the backend call with no session), and
      `POST /api/auth/login`'s refresh-cookie relay on success (and non-relay on failure).
      Full suite: 110 tests (was 97), all green; `tsc --noEmit`, `eslint`, and `next build`
      all clean (one pre-existing, unrelated `eslint` error in `user-row-actions.tsx` — not
      touched by this pass, not introduced by it).
- [x] **Extra, approved by the user before starting:** fixed a real backend bug found while
      verifying this file against the backend source — `backend/src/users/users.module.ts`'s
      own `JwtModule` registration (used to re-sign the access token right after the mandatory
      first-login password change) was still `expiresIn: '1h'`, unchanged from the
      pre-migration design and never updated alongside `auth.module.ts`'s `15m`. Fixed to
      `15m`; `backend/CLAUDE.md` should get a matching note next time it's touched.

## Phase 2, shared foundation (before any module page) — DONE 2026-08-07

- [x] `src/types/security.ts`: `Severity`, `ModuleName`, `TenantModule`, `BaseQueryFilters`,
      `AssignPayload`. Per-module enums/statuses split into their own files instead
      (`src/types/{vm,edr,siem,cti,soar,dfir,assets}.ts`) rather than one growing file — see
      each file's own header comment. All hand-mirrored against a full read of
      `backend/prisma/schema.prisma`, same `as const` object plus derived type pattern as
      `src/types/auth.ts`.
- [x] Per-module record types in those same files: `VmAsset`, `VmVulnerability`,
      `EdrEndpoint`, `EdrDetection`, `SiemLog`, `SiemAlert`, `CtiIoc`, `SoarPlaybook`,
      `SoarExecution`, `DfirIncident`, `DfirLink`, `DfirIncidentDetail` (the one detail-route
      shape, `DfirIncident & { links: DfirLink[] }`), `AssetFeedEntry`, `TenantModule`. Every
      assignable record has `assignedToUserId: string | null`; `rawData: unknown | null`
      only on the models that actually have it in the schema (not all do — `VmAsset`,
      `EdrEndpoint`, `SoarPlaybook`/`SoarExecution`, `DfirIncident`/`DfirLink` don't). Also
      added `{SIEM,EDR,DFIR}_*_TRANSITIONABLE_STATUSES` constants (not originally listed
      here, needed by `StatusTransitionMenu` below) mirroring each status DTO's `@IsIn(...)`
      restriction. Verified: list endpoints never `include` relations (checked every
      service's `findMany`/`findUnique` call), so these are flat shapes with foreign-key ids
      only, no nested `asset`/`assignedToUser` objects.
- [x] Reworked `src/lib/severity.ts` to key off the real uppercase `Severity`. Its two
      callers (`AlertsTable`, `SeverityBreakdown`) still consume `src/lib/mock-data.ts`,
      which was uppercased to match rather than kept lowercase — `mock-data.ts`'s own
      `Severity` type now just re-exports the real one instead of duplicating it, so there's
      one casing in the codebase, not two, even though the dashboard's data is still fake
      until Phase 9.
- [x] `src/lib/query-filters.ts`: `buildQueryParams()` (the object → `URLSearchParams`
      builder, ISO date serialization) and `hasNextPage(itemCount, pageSize)` (the "was the
      page full" heuristic every list page's pagination needs — not originally called out as
      its own function, added since every list page will need this exact check).
- [x] `src/components/security/next-only-pagination.tsx`: `NextOnlyPagination`, a
      simplified variant of `(dashboard)/users`' Previous/Next controls, no "Page X of Y".
- [x] `src/lib/proxy-route.ts`'s `proxyToBackend()`, proven against
      `src/app/api/vm/assets/route.ts` (`GET`/`POST`, the latter using a new
      `src/lib/validations/vm.ts` and `api-guards.ts`'s new `requireAnalystOrAdmin` /
      `requireAuthenticated` — the latter added because `requireRole()` can't express "any
      authenticated role" with an empty roles list without rejecting everyone). One real
      shape bug caught by building this real route immediately, exactly per decision 6's
      reasoning for proving the helper first: `<Select>` with no `value`/`defaultValue` prop
      couldn't infer its generic from context, failing `tsc` until given an explicit
      `<Select<string>>` — would have hit the same error 35 more times otherwise.
- [x] `src/components/security/assignment-control.tsx`'s `AssignmentControl`: Admin gets a
      plain (not searchable) `<Select>` of `assignableUsers` passed down as a prop — no
      combobox/cmdk-equivalent primitive exists in this shadcn preset, flagged in the
      component's own comment as a simplification to revisit if a tenant's member list ever
      gets large, not silently built as if it were real search. `assignableUsers` is fetched
      once per list page (`GET /users`, filtered client-side to `ADMIN`/`ANALYST`) and passed
      down, not re-fetched per row. Analyst gets a single "Assign to me" button, matching
      `resolveAssignee`'s server-side rule exactly. Viewer renders nothing. Unassign wired to
      the same endpoint via `DELETE`. The 2026-08-07 `409` (already-resolved/contained)
      needs no special-casing — `proxyToBackend()`'s error branch already normalizes it to
      `{ message }` like any other error status, so the component just shows `data.message`
      via `toast.error()`.
- [x] `src/components/security/status-transition-menu.tsx`'s `StatusTransitionMenu`,
      generic over the module's status type, parameterized by a
      `transitionableStatuses` array (from the new `*_TRANSITIONABLE_STATUSES` constants
      above) — a dropdown menu excluding whatever status is already current. Does not cover
      VM (confirmed no shared shape — `PATCH vulnerabilities/:id/status` takes the full
      `VmVulnerabilitiesStatus` enum, not a restricted transition set) or SOAR (no
      status-transition route exists for `SoarExecution` at all, it's already terminal by
      the time a human sees it).
- [x] Tests: `__tests__/vm-assets-route.test.ts` (7, proxyToBackend/VM route),
      `__tests__/query-filters.test.ts` (6), `__tests__/next-only-pagination.test.tsx` (6),
      `__tests__/assignment-control.test.tsx` (7), `__tests__/status-transition-menu.test.tsx`
      (6) — 32 new tests. Full suite: 143 tests (was 110), all green; `tsc --noEmit`,
      `eslint`, `prettier --check`, and `next build` all clean (same one pre-existing,
      unrelated `eslint` finding in `user-row-actions.tsx` as Phase 1, still untouched).
      `StatusTransitionMenu`/`AssignmentControl`'s dropdown-menu interactions are tested with
      real click-through (`userEvent` + `screen.findByRole("menu")`), matching the pattern
      already established by `user-row-actions.test.tsx`; `AssignmentControl`'s Admin
      `<Select>` picker is tested for presence/placeholder only, not a full open-and-choose
      interaction — no existing test in this suite drives that primitive yet, and the
      underlying submit logic is already fully covered via the Analyst/Unassign paths, which
      exercise the exact same `submit()` function.

## Phase 3, VM module

- [ ] `src/app/(dashboard)/vm/page.tsx`: vulnerabilities list (severity, status, assignee,
      asset, CVE if present), filters (severity, status, assignedToUserId including an
      "assigned to me" quick filter using the session's own `userId`), "Next" pagination.
- [ ] `src/app/(dashboard)/vm/assets/page.tsx` or a tab on the same page: asset list, create
      (Admin, Analyst), edit, delete (blocked with a `409` if vulnerabilities reference it,
      surface that message rather than a generic error).
- [ ] Row actions: assign, unassign, status change via `UpdateVulnerabilityStatusDto`'s full
      enum (`OPEN`, `REMEDIATED`, `ACCEPTED_RISK`), gated Admin/Analyst, hidden for Viewer.
- [ ] Zod schemas mirroring `CreateVmAssetDto`, `UpdateVmAssetDto`,
      `UpdateVulnerabilityStatusDto`, plus the shared `AssignDto`.
- [ ] Route Handlers under `src/app/api/vm/**` via `proxyToBackend()`.
- [ ] Tests: Route Handler RBAC/success/error, asset form validation, row-action dialogs.

## Phase 4, EDR module

- [ ] `src/app/(dashboard)/edr/page.tsx`: detections list (severity, status, assignee,
      endpoint hostname, MITRE techniques if present), same filter set as VM.
- [ ] `src/app/(dashboard)/edr/endpoints/page.tsx` or a tab: endpoint list (hostname, ip, os,
      status, last seen), edit, delete (blocked with `409` if it has detections, point at
      `DECOMMISSIONED` as the alternative, matching the backend's own error message). No
      create form, there is no manual create route, only `ingest()`'s upsert.
- [ ] Row actions: assign, unassign, status change (`ESCALATED`/`RESOLVED` only, per
      `TRANSITIONABLE_STATUSES`).
- [ ] Zod schemas mirroring `UpdateEdrEndpointDto`, `UpdateEdrDetectionStatusDto`, the
      shared `AssignDto`.
- [ ] Route Handlers under `src/app/api/edr/**`.
- [ ] Tests, same shape as Phase 3.

## Phase 5, SIEM module

- [ ] `src/app/(dashboard)/siem/page.tsx`: alerts list, replacing the mock alerts table
      described in "Known gaps" above. Same filter set. Consider whether `GET logs` needs
      its own view at all for a first pass, logs are the raw pre-alert record and may not be
      worth a dedicated page before there is a real user asking for it, flag this rather
      than silently building or silently skipping it.
- [ ] Row actions: assign, unassign, status change (`ESCALATED`/`RESOLVED` only).
- [ ] Zod schema mirroring `UpdateSiemAlertStatusDto`, the shared `AssignDto`.
- [ ] Route Handlers under `src/app/api/siem/**`.
- [ ] Tests, same shape as Phase 3.

## Phase 6, CTI module

- [ ] `src/app/(dashboard)/cti/page.tsx`: IOC list (type, value, confidence, source), filter
      by type plus the shared date range.
- [ ] Create (Admin, Analyst), edit confidence/source only (type and value are the IOC's
      identity per `UpdateCtiIocDto`'s own comment, not editable), delete.
- [ ] Zod schemas mirroring `CreateCtiIocDto`, `UpdateCtiIocDto`.
- [ ] Route Handlers under `src/app/api/cti/**`.
- [ ] Tests, same shape as Phase 3.

## Phase 7, SOAR module

- [ ] `src/app/(dashboard)/soar/page.tsx`: two sections, playbooks and executions.
- [ ] Playbook CRUD, Admin only: create/edit with a severity-only `triggerCondition` picker
      (matching `TriggerConditionDto`, a single `Severity` select, not a free-form JSON
      editor, the backend does not accept anything richer today), an `actions` field that
      stays a raw JSON textarea since the backend genuinely validates it as an open object
      (SOAR execution is simulated, per the backend's own decision 8, there is no real
      action schema to build a structured form against), `isActive` toggle, delete (blocked
      with `409` if it has executions, point at the `isActive` toggle instead, matching the
      backend's error message).
- [ ] Executions list, read-only for every role, no assign/status actions exist for this
      module by design (`SoarExecution` is already terminal by the time a human sees it).
- [ ] Zod schemas mirroring `CreateSoarPlaybookDto` (including the nested
      `TriggerConditionDto`), `UpdateSoarPlaybookDto`.
- [ ] Route Handlers under `src/app/api/soar/**`.
- [ ] Tests, same shape as Phase 3.

## Phase 8, DFIR module

- [ ] `src/app/(dashboard)/dfir/page.tsx`: incident list (title, severity, status, assignee).
- [ ] `src/app/(dashboard)/dfir/[id]/page.tsx`: the one real detail page per decision 8
      above, incident fields plus its `DfirLink[]` (source type, source id), a manual
      "link an existing record" form (`sourceType` select from `DfirLinkSourceType`'s six
      values, `sourceId` as a raw UUID input, there is no id-typeahead/search endpoint to
      build anything friendlier against, note this as a real limitation rather than
      over-building past what the backend supports), and unlink per row.
- [ ] Row actions on the list: assign, unassign, status change (`ESCALATED`, `CONTAINED`,
      `RESOLVED`, per the five-value `DfirIncidentStatus`).
- [ ] Zod schemas mirroring `UpdateDfirIncidentStatusDto`, `CreateDfirLinkDto`, the shared
      `AssignDto`.
- [ ] Route Handlers under `src/app/api/dfir/**`.
- [ ] Tests, same shape as Phase 3, plus the detail page's link/unlink flow.

## Phase 9, asset feed and dashboard integration

- [ ] `src/app/(dashboard)/assets/page.tsx` (or fold into the existing dashboard, decide
      explicitly rather than defaulting to one without considering the other): `GET
      /assets/feed` list with severity/assignedToUserId/date filters and "Next" pagination,
      each row showing its source module (badge), type, severity, status, assignee, and
      deep-linking to that record's owning module page.
- [ ] Replace `src/lib/mock-data.ts`'s severity breakdown and alerts table with data derived
      from real module queries or the feed, per decision 5's casing change.
- [ ] Replace the four mock KPI numbers per decision 10 above, this needs its own small
      design pass (which endpoint or combination of endpoints backs each number), not a
      find-and-replace.
- [ ] Decide whether `mockTopAttackSources` has any real backend equivalent at all today (a
      quick read of the schema suggests no module currently stores a structured "source IP"
      field consistently enough to aggregate one), if not, either drop that dashboard panel
      or leave it clearly marked as illustrative rather than presenting mock numbers as real.

## Phase 10, real-time delivery (SSE)

- [ ] `src/app/api/events/stream/route.ts`: a Route Handler that server-side fetches the
      backend's `GET /events/stream` with the caller's `Authorization` header attached (via
      `backendFetchAuthed`-style token access) and streams the response body back to the
      browser. Check `node_modules/next/dist/docs/` for this Next version's actual streaming
      Route Handler semantics before assuming standard `Response` streaming behavior applies
      unmodified, this is exactly the kind of API this project has already been burned by
      trusting prior knowledge on (`middleware.ts` to `proxy.ts`, `reset` to
      `unstable_retry`). This exact follow-up is already flagged from the backend side too,
      see `backend/CLAUDE.md`'s Phase 8 entry.
- [ ] A client component wrapping `new EventSource("/api/events/stream")`, mounted first on
      the Security Overview dashboard and the new asset feed page only, per decision in this
      phase, not wired into every module list page in the same pass. Live behavior: a
      `sonner` toast on a new critical-severity event, live-prepend on the feed/dashboard
      list, live status-pill updates on `*.assigned`/`*.status_changed`/`*.unassigned`
      frames for whichever records are currently rendered.
- [ ] No tenant-filtering logic needed client-side, `EventsService.streamForTenant` already
      filters server-side per the backend's own design.
- [ ] Revisit decision 3 above (lazy-only refresh) once this phase is built, a long-lived
      SSE connection plus a 15 minute access token used only for the initial proxy request
      means the underlying HTTP connection outlives the token that authorized it, confirm
      whether that matters given how the backend's SSE auth actually works (checked once at
      connection time, not per-frame) before assuming it needs a fix.
- [ ] Tests: the Route Handler's streaming behavior is awkward to unit test meaningfully,
      a live manual verification (matching the backend's own SSE verification approach, see
      `backend/CLAUDE.md`'s Phase 8 entry) is likely more honest here than a mocked test that
      does not exercise real streaming.

## Phase 11, tenant module activation UI (Super Admin)

- [ ] Add a rename action next to the existing delete button on `(dashboard)/tenants`,
      wired to the new `PATCH /api/tenants/[id]` Route Handler.
- [ ] `(dashboard)/tenants/[id]` gains a "Modules" section: list active `TenantModule` rows,
      activate (`ModuleName` picker plus an optional raw JSON `config` field, matching
      `ActivateTenantModuleDto`'s shape), toggle `isActive`, edit `config`, remove.
- [ ] Zod schemas mirroring `ActivateTenantModuleDto`, `UpdateTenantModuleDto`,
      `UpdateTenantDto`.
- [ ] Route Handlers under `src/app/api/tenants/[id]/modules/**` and the new `PATCH
      /api/tenants/[id]`.
- [ ] Tests, same shape as the existing tenant Route Handler coverage.

## Phase 12, RBAC and nav polish

- [ ] `src/lib/nav.ts`/`src/components/dashboard/sidebar-nav.tsx` currently link every role
      to the same generic `[module]` stub. Once real pages exist, Viewer should still see
      and reach all six module pages, read-only, per the backend's own "Viewer is read-only,
      not blocked" default (decision 9 in the backend's module plan). No route-level change
      needed on the frontend's auth layers for this, `requireSession()` has no role check
      today for these routes and should not gain one, only the row-action components
      (`AssignmentControl`, `StatusTransitionMenu`, the CRUD forms) need to hide themselves
      for a Viewer session, matching how `UserRowActions` already handles self-targeting.
- [ ] Once `(dashboard)/[module]/page.tsx` is fully replaced by six real folders (Phases 3
      through 8), confirm Next's routing precedence actually resolves `/dashboard/vm` to the
      new static `vm/` folder rather than the old dynamic `[module]/` one before deleting the
      stub, check `node_modules/next/dist/docs/` rather than assuming, then delete the stub
      and `src/lib/nav.ts`'s `isModuleSlug` guard if nothing else still needs it.

## Phase 13, final verification pass

- [ ] Walk the verified route inventory above one more time against the finished frontend,
      confirm every route has either a Route Handler plus UI affordance, or an explicit,
      documented reason it does not (the four `POST .../events` routes per decision 7, EDR's
      missing manual-create per its own note). No route should be silently missing without
      one of those two outcomes being true and written down.
- [ ] Full test suite run, confirm `__tests__/` is no longer gitignored before trusting any
      test count reported here (see "Testing" above).
- [ ] Update this file's "Directory structure" diagram, "Known gaps" section, and
      "Functionality backlog" once each phase actually ships, per this file's own existing
      "update it as items land, do not let it drift" rule. Update
      `docs/internship-report-frontend.md` per phase too, matching the backend's own
      per-phase logging discipline, not as one giant retroactive writeup at the end.

# Working with this repo

- Same conventions as the backend: don't guess at root causes, verify against
  `node_modules/next/dist/docs/` or the actual generated file before assuming an API
  behaves like an older/more familiar version.
- The person driving this project is doing it to learn — when working here, prefer
  explaining tradeoffs and pointing at the relevant doc over silently picking an approach,
  unless explicitly asked to just implement something.
