@AGENTS.md

# Frontend — SecOps

Next.js client for the SecOps multi-tenant SOC SaaS platform. See root `../CLAUDE.md` for
overall project context and the backend API contract, and `../backend/CLAUDE.md` for the
RBAC/provisioning model this UI has to respect. This file is the frontend-specific
counterpart, kept in sync by hand as the project develops. For the full narrative
development log (chronological, with rationale — mirrors `backend/docs/
internship-report-backend.md`), see `docs/internship-report-frontend.md`.

# Stack (as actually installed, 2026-08-19 — re-verify against package.json before trusting)

- Next.js 16.2.12, App Router, `src/` directory, Turbopack — bumped from 16.2.10 on 2026-08-19
  to close nine of the framework's own direct CVEs (see "Known gaps" below).
- React 19.2.4, TypeScript 6.0.3 — matches the architecture spec PDF and the backend
  (`backend/package.json` was already pinned to `^6.0.3`; only the frontend, via
  `create-next-app`'s `"typescript": "^5"`, had drifted to 5.9.3). Resolved 2026-08-19:
  `npm view typescript versions` confirmed 6.0.3 is a real, stable release (not a beta/dev
  tag — 6.0.0-beta → 6.0.1-rc → 6.0.2 → 6.0.3), and `typescript-eslint@8.64.0`'s peer range
  (`>=4.8.4 <6.1.0`) covers it. Installed and re-verified (`tsc --noEmit`, full test suite,
  `next build`, live smoke test all clean) rather than left as an open question.
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
    (dashboard)/dashboard, users, tenants, vm, edr, siem,
      cti, soar, dfir, assets                              — sidebar layout, session-gated;
                                                             vm/, vm/assets/ (Phase 3),
                                                             edr/, edr/endpoints/ (Phase 4),
                                                             siem/, siem/logs/ (Phase 5),
                                                             cti/ (Phase 6), soar/ (Phase 7),
                                                             dfir/, dfir/[id]/ (Phase 8), all
                                                             2026-08-07 — all six modules now
                                                             have real pages; assets/ (Phase
                                                             9, 2026-08-07) — the unified
                                                             GET /assets/feed view. The old
                                                             [module]/page.tsx stub (a
                                                             placeholder every module slug
                                                             resolved to before its real
                                                             folder existed) is deleted as of
                                                             Phase 12, 2026-08-07 — every one
                                                             of the six slugs above has been
                                                             a real folder since Phase 8
    api/auth/..., api/users/..., api/tenants/...         — Route Handlers (BFF proxy layer)
    api/vm/**, api/edr/**, api/siem/**, api/cti/**,
      api/soar/**, api/dfir/**, api/assets/feed            — all six modules' routes, all
                                                             2026-08-07, all via
                                                             proxyToBackend() (Phase 2);
                                                             api/assets/feed added Phase 9
    api/events/stream                                    — Phase 10 (2026-08-07): raw
                                                             ReadableStream proxy for the
                                                             backend's SSE endpoint, NOT via
                                                             proxyToBackend() (that helper
                                                             buffers via .json(), which would
                                                             never resolve for a stream)
    icon.tsx                                             — generated favicon (next/og)
    not-found.tsx, error.tsx, global-error.tsx, loading.tsx  — see error.md's `unstable_retry`
                                                                note below; not-found.tsx
                                                                deliberately doesn't call
                                                                getSession() (see its own
                                                                comment — forces static pages
                                                                dynamic app-wide otherwise)
    layout.tsx, page.tsx, globals.css
  components/
    brand-mark.tsx — <BrandMark />, added 2026-08-19: the hexagon-plus-pulse-line SVG mark,
                   shared by sidebar-nav.tsx and login/page.tsx (both previously duplicated
                   the same inline "S"-in-a-square markup). Kept in visual sync by eye with
                   src/app/icon.tsx (the favicon — a separate next/og ImageResponse render
                   path that can't import a regular component)
    ui/          — shadcn-generated, don't hand-edit the primitives casually
    auth/        — login/forgot-password/change-password forms
    dashboard/   — sidebar nav, KPI cards, severity + events-by-module breakdown panels,
                   recent-activity table (all real GET /assets/feed data since Phase 9,
                   2026-08-07 — events-by-module.tsx replaced the old mock "top attack
                   sources" panel, no module stores a structured source-IP field to
                   honestly aggregate one; the old alerts-table.tsx is gone, the dashboard
                   now reuses components/assets/feed-table.tsx instead)
    assets/      — FeedTable (Phase 9, 2026-08-07): the read-only cross-module row shown on
                   both (dashboard)/assets and the dashboard's own "recent activity" panel
    users/       — Admin user list, create-user form, UserRowActions (edit/role/reset/delete
                   dropdown + dialogs)
    tenants/     — Super Admin tenant list, create form, delete-confirm/rename buttons
                   (RenameTenantButton added Phase 11, 2026-08-07), tenant detail's
                   "Modules" section (TenantModulesTable, ActivateModuleForm,
                   TenantModuleRowActions — Phase 11)
    security/    — cross-module shared row-action components, added Phase 2 (2026-08-07):
                   NextOnlyPagination, AssignmentControl, StatusTransitionMenu — every
                   module page in Phases 3-8 reuses these instead of rebuilding row actions
                   per module. live-events.tsx's <LiveEvents /> added Phase 10 (2026-08-07):
                   the EventSource client mounted on the dashboard and (dashboard)/assets
    vm/          — VM module (Phase 3, 2026-08-07): asset create form/row actions, vuln/asset
                   tables, VulnerabilityStatusMenu (VM-specific — full status enum, not the
                   shared StatusTransitionMenu's restricted transition set)
    edr/         — EDR module (Phase 4, 2026-08-07): endpoint row actions (edit/delete only,
                   no create — no manual create route exists), detections/endpoints tables.
                   Uses the shared StatusTransitionMenu directly (unlike VM) — EDR's status
                   route really is restricted to ESCALATED/RESOLVED
    siem/        — SIEM module (Phase 5, 2026-08-07): alerts table (shared AssignmentControl
                   + StatusTransitionMenu, same restricted shape as EDR's), a read-only
                   LogsTable (no row actions — no PATCH/DELETE route exists for SiemLog)
    cti/         — CTI module (Phase 6, 2026-08-07): create IOC form, row actions (edit
                   confidence/source only — type/value are the IOC's identity, not
                   editable). No AssignmentControl/StatusTransitionMenu anywhere — CTI is the
                   one module with neither a status nor an assign route
    soar/        — SOAR module (Phase 7, 2026-08-07): playbook create form/row actions
                   (severity-only trigger picker, raw JSON actions textarea, isActive
                   toggle), a read-only ExecutionsTable. Admin-only, unlike every other
                   module's Admin-or-Analyst mutation routes
    dfir/        — DFIR module (Phase 8, 2026-08-07, last of the six): incidents table
                   (shared AssignmentControl + StatusTransitionMenu), LinkRecordForm and
                   LinksTable for the one real per-record detail page's DfirLink[] trace
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
    validations/  — zod schemas mirrored from backend DTOs (now incl. validations/vm.ts,
                    validations/edr.ts, validations/siem.ts, validations/cti.ts,
                    validations/soar.ts, validations/dfir.ts,
                    validations/security.ts's shared assignPayloadSchema, and
                    validations/tenants.ts gaining updateTenantSchema/
                    activateTenantModuleSchema/updateTenantModuleSchema in Phase 11,
                    2026-08-07)
    asset-feed.ts — isOpenFeedEntry() (source-aware terminal-status check, added Phase 9,
                    2026-08-07) and hrefForFeedEntry() (DFIR gets a real per-record deep
                    link, every other source links to its module's list page)
    live-events.ts — classifyLiveEvent()/describeCreatedEvent()/severityOf(), added Phase 10
                    (2026-08-07): the SSE frame discriminator the backend's own @Sse
                    endpoint doesn't provide (see Phase 10's own checklist entry)
    severity.ts, nav.ts  — mock-data.ts deleted Phase 9 (2026-08-07), its last consumers
                    (the dashboard's severity/attack-source panels and alerts table) were
                    all replaced with real data in the same pass
  types/
    auth.ts       — UserRole, SessionClaims — hand-matched to backend/src/generated/prisma
    security.ts, vm.ts, edr.ts, siem.ts, cti.ts, soar.ts, dfir.ts, assets.ts — added Phase 2
                    (2026-08-07): enums, record types, and each module's
                    *_TRANSITIONABLE_STATUSES, hand-matched to backend/prisma/schema.prisma
  proxy.ts       — optimistic route protection (see below)
e2e/             — Playwright, added 2026-08-19: real Chromium against the real running
                   stack (frontend + backend + seeded Postgres), not mocked, unlike
                   __tests__/. `npm run test:e2e`; see e2e/README.md and the "Testing"
                   backlog entry below for the full account, including two real bugs found
                   building it (browser.newContext() inherits storageState unless cleared;
                   the backend's shared auth-controller rate limit needs deliberate pacing)
playwright.config.ts — testDir: "./e2e", workers: 1 (shared demo-tenant data — parallel
                   runs would race each other's mutations), 90s per-test timeout (paced
                   auth calls can legitimately take a while, see e2e/helpers.ts)
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
   _old_ refresh token the instant it receives a `POST /auth/refresh` request, regardless of
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
  currently no backend endpoint for a Super Admin to fetch their own profile. Tenant data
  itself is real (`src/app/(dashboard)/tenants/page.tsx` + `src/app/api/tenants/` wire up
  `GET`/`POST /tenants`, and the dashboard's `SuperAdminOverview` pulls the same real list
  instead of mock data), including deletion (`DeleteTenantButton`, confirm-dialog-gated)
  and, since Phase 11 (2026-08-07), rename and the full `TenantModule` activation surface —
  **found stale and corrected during Phase 13's verification pass (2026-08-08):** this
  bullet's parenthetical had claimed "tenant deletion has no UI yet" long after
  `DeleteTenantButton` was actually built (2026-07-16's "second pass") — a real, if minor,
  drift this file's own "update it as items land" rule was supposed to prevent, caught only
  now by Phase 13's dedicated re-read rather than any earlier pass.
- ~~**Dashboard content is mock data**~~ **No longer true, this bullet is stale.** Fixed in
  Phase 9 (2026-08-07, see the adaptation plan below) — the dashboard's KPIs, both
  breakdown panels, and its recent-activity table are all real `GET /assets/feed` data now,
  and `src/lib/mock-data.ts` itself has been deleted. Left struck through rather than
  removed so the drift is visible, matching this file's own existing convention (see the
  "Admin can list/create users..." bullet further down). The `[module]/page.tsx` stub this
  bullet used to also point at as stale is deleted too now (Phase 12, 2026-08-07).
- ~~**No row-level actions on the alerts table**~~ **No longer true — the premise itself is
  gone.** The mock alerts table this bullet described was replaced entirely by real SIEM
  data with real `AssignmentControl`/`StatusTransitionMenu` row actions back in Phase 5
  (2026-08-07); every module's list page has had real row actions since. Found stale during
  Phase 13's verification pass, left struck through per this file's own convention.
- ~~Admin can list/create users but not yet edit/delete/reset-password/change-role from
  the UI~~ **No longer true, this bullet was stale.** The full action set landed the same
  day this file's "Known gaps" section was last written (see the "Third pass" entry under
  "Recently completed" below) and this bullet was never removed afterward, contradicting
  that entry. Left struck through rather than deleted so the drift is visible; corrected
  2026-08-06 while auditing this file against the backend for the adaptation plan below.
- **`npm audit`, resolved 2026-08-19**: the prior note here ("a moderate PostCSS advisory")
  was itself stale — a live audit found `next@16.2.10` carrying nine of its own direct
  high/moderate CVEs (middleware/proxy bypass, Server Actions DoS and SSRF, cache confusion,
  an Image Optimization DoS), all fixed upstream in `16.2.11`. Bumped to `16.2.12` (latest
  patch at the time), re-verified clean (`tsc --noEmit`, full 289-test suite, `next build`,
  and a live browser smoke test all pass). What's left after that fix is genuinely the
  original, narrower shape of this note: `next`'s own bundled `postcss`/`sharp` copies
  (build-time only, no independent version to bump without Next.js itself updating them) plus
  a handful of advisories in `eslint-config-next`/`eslint`/`jest`/`shadcn`'s own dependency
  trees — traced individually via `npm ls <pkg>`, every one confirmed devDependency-only,
  never reachable from the deployed app's runtime bundle. Left as an accepted, low-relevance
  risk, same reasoning as before — just don't assume "PostCSS, moderate" is still the whole
  picture without re-running `npm audit` first.
- Root layout hard-codes the `dark` class instead of wiring up a `next-themes` toggle — the
  UI spec is a dedicated dark console with no light-mode mockup or toggle control anywhere
  in Figures 1-4. `next-themes` is installed (pulled in by `shadcn init`) if a real toggle
  is wanted later.
- A first Jest + RTL test suite exists (`npm test`) but is far smaller than the backend's
  Jest + Supertest e2e coverage — see "Testing" in the functionality backlog below for
  exactly what's covered and what isn't.
- ~~Favicon is generated... not a designed brand asset~~ **No longer true, fixed
  2026-08-19.** The bold-letter-in-a-rounded-square mark was a genuine placeholder (a
  generic AI-default shape). Replaced with a hexagon-plus-monitoring-pulse mark — same
  brand violet (`#6c63ff`, unchanged), same silhouette family as the app's own hexagon
  motif (the login page's "6 MODULES" stat), carrying a pulse/EKG line instead of a
  literal "S" since the wordmark next to it already spells the name out. Defined once as
  `src/components/brand-mark.tsx` (a real `<svg>`, used in-app by `sidebar-nav.tsx` and
  `login/page.tsx`, both places the old inline "S" span was duplicated) and separately as
  `src/app/icon.tsx` (the browser-tab favicon, via `next/og`'s `ImageResponse` — a
  different render path that can't share the component directly, kept in visual sync by
  eye). Verified live at both the actual favicon size and enlarged, `tsc`/`eslint`/full
  test suite/`next build` all clean, no test depended on the old literal "S" text (a
  targeted grep of `__tests__/` for it came back empty before assuming so). Left struck
  through rather than deleted per this file's own convention.
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

**Recently completed** (2026-08-08, twentieth pass — `/code-review` findings, fixed): a
full-branch `/code-review` run against the nineteenth pass's diff (below) returned six
findings; all six addressed rather than triaged away. Two were real doc-accuracy bugs in
CLAUDE.md's own nineteenth-pass entry, caught within a day of being written: its claim that
`prettier --check` was down to "exactly the same 9 pre-existing unformatted `src/` files"
was false the moment it was written — `docs/superpowers/specs/2026-07-28-password-change-
request-flow-design.md` had just been un-gitignored by that same pass and was never actually
run through `prettier --write`, making the true count 10, not 9. Fixed by formatting the
spec file (asterisk-emphasis → underscore, matching the rest of the repo's Markdown
convention) rather than by softening the claim — the count is genuinely 9 again now. The
other four were real test-suite hygiene findings: a byte-for-byte-identical `setSession()`
cookie-store mock (`get`/`set`/`delete` stub plus the `next/headers` wiring) was copy-pasted
across 11 Route Handler test files, and 9 of those 11 hardcoded the literal string
`"secops_token"` instead of importing `SESSION_COOKIE` from `src/lib/session.ts` the way the
other 2 already did — a rename of that constant would have silently broken 9 files for a
confusing, unrelated-looking reason. Extracted the store-building logic to a new
`setSessionCookie(mockedCookies, token)` in `test-utils.ts` (the `jest.mock("next/headers",
...)` registration itself has to stay in each test file — Jest's hoisting only rewrites
`jest.mock` calls it finds literally in the file being compiled, confirmed against
`babel-plugin-jest-hoist`'s actual behavior before assuming a full extraction was possible),
imported and used by all 11 files now. Also collapsed `tenants-routes.test.ts`'s two
overlapping request-builders (`req()` was a hardcoded-to-POST duplicate of `reqMethod()` in
everything but name) into one — `req(body)` is now `reqMethod("POST", body)`. The sixth
finding (the `.gitignore` fix has no CI/pre-commit guard against the same directories being
re-ignored later) is a real, already-tracked gap — see "No CI" in Polish/infra below, left
there rather than duplicated. Full suite re-verified after every change: 289/289 tests
(unchanged — this was a refactor of test infrastructure, not new coverage),
`tsc --noEmit`/`eslint --max-warnings=0`/`next build` all clean, `prettier --check` back to
the true 9-file baseline this claim now correctly describes.

**Recently completed** (2026-08-08, nineteenth pass — Phase 13, final verification, plus a
follow-up full frontend-backend adaptation audit requested directly): Phase 13 itself found
and fixed a real gitignore bug (`__tests__/`, `__mocks__/`, `docs/` had never been tracked in
git all session, contradicting two earlier passes' claims otherwise — see Phase 13's own
entry below for the full account) and two stale route-inventory claims. The follow-up audit
went well beyond re-confirming Phase 13's route walk: every mutation DTO in
`backend/src/**/dto/*.ts` was diffed field-by-field against its `src/lib/validations/*.ts`
zod counterpart (100% match, no drift, across all thirteen DTOs checked), every Prisma model
backing the six modules was diffed field-by-field against its `src/types/*.ts` interface
(100% match), and — since the request specifically asked whether the app matches the
backend's demo data — `backend/prisma/seed-modules.ts` (the `npm run seed:demo` dataset,
5 tenants/~3500 rows) was read in full. **Found one real bug there**, backend-side, not
frontend: the demo script's `AssetFeedEntry` rows for EDR/SIEM/VM/DFIR never carried over
each source record's own `status`/`assignedToUserId` (silently `null` for all of them),
unlike what the real `AssetService` listeners this script mirrors always set — meaning the
Asset Feed page and dashboard KPIs (`isOpenFeedEntry`, "assigned to me") would show every
demo row as unassigned/closed even though the underlying VM/EDR/SIEM/DFIR records genuinely
have varied assign/status state seeded on them. Fixed directly in
`backend/prisma/seed-modules.ts` (see `backend/CLAUDE.md`'s Phase 10 entry for the full
account) — the six module pages themselves were never affected, only the cross-module feed
view. Also ran the backend's full test suite for the first time this session (694 tests: 507
unit + 187 e2e, all green — the e2e run needed `--runInBand`, a full-parallel run hit false
timeouts from `argon2.hash` CPU contention across 11 workers in this sandbox, not a real
failure) and re-read the backend's three most recent commits' diffs directly to confirm
nothing shipped since Phase 13's last check — confirmed backend-internal only (refresh-token
race-condition hardening, atomic lockout counter, CTI ingest concurrency), no frontend-visible
change. No frontend code changed in this pass — 289/289 tests, `tsc`/`eslint`/`prettier`/
`next build` all reverified clean regardless, since the standard was "verify, don't assume."

**Recently completed** (2026-08-07, eighteenth pass — Phase 12, RBAC and nav polish): mostly
a confirmation pass, not a fix pass — audited all six module pages plus the Phase 9 asset
feed page directly against the backend's "Viewer is read-only, not blocked" default before
changing anything, and found every page and every row-action/table component was already
built Viewer-correct across Phases 3-8 (no `redirect(` conditioned on role anywhere, every
shared/module-specific action component already hides itself for `UserRole.VIEWER`, SOAR's
Admin-only actions column correctly reflects its genuinely different RBAC rather than being
a Viewer-specific gap). The one real change: deleted the now-fully-superseded
`(dashboard)/[module]/page.tsx` placeholder stub and `src/lib/nav.ts`'s `isModuleSlug`/
`ModuleSlug` exports, after re-confirming Next's static-over-dynamic routing precedence via
a real rebuild (`/[module]` gone from the route table, every real module route unaffected) —
not just re-citing Phase 3's earlier proof of the same rule. One genuine snag along the way:
`tsc --noEmit` failed against stale generated `.next/**/types/validator.ts` files still
referencing the deleted route until `.next` was cleared — not a code problem, a build-cache
staleness issue worth remembering for future route deletions in this project. Test suite
unchanged at 289 (nothing ever tested the stub); `tsc --noEmit`, `eslint`,
`prettier --check`, and `next build` all reverified clean after the deletion.

**Recently completed** (2026-08-07, seventeenth pass — Phase 11, tenant module activation
UI): the last real backend surface with zero frontend at all — `TenantModule` CRUD
(`GET/POST/PATCH/DELETE /tenants/:id/modules[/:moduleName]`) — is wired up, plus
`PATCH /tenants/:id` (rename). `(dashboard)/tenants/[id]` gains a "Modules" section
(`TenantModulesTable` + `ActivateModuleForm`, and `TenantModuleRowActions` for toggle
`isActive`/edit `config`/remove), following the same "raw JSON textarea for an open,
unconstrained `config` object" reasoning already established for SOAR's `actions` field —
there's no per-module config shape defined anywhere yet to build a structured form against.
One small addition beyond the plan's literal text: `ActivateModuleForm`'s picker filters
out modules the tenant already has a row for, since `activateModule` 409s on a duplicate by
a real unique constraint — cheap, obviously correct, not asked for explicitly. The two new
Route Handlers under `modules/**` use `proxyToBackend()` (new surface, no existing sibling
to stay consistent with); the rename `PATCH` was added to the existing hand-rolled
`tenants/[id]/route.ts` instead, matching its sibling `DELETE`'s style rather than mixing
patterns within one file. One real accessibility gap found and fixed while writing tests,
not worked around in the test itself: the edit dialog's config textarea had no associated
`<label>` — added one, matching every other form field in the app. Test suite grew from 264
to 289 tests (24 new); `tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all
verified clean. With this phase, every route in the "Verified backend route inventory"
below has either a Route Handler plus UI, or one of decision 7/EDR's own documented
exceptions — Phase 13's final pass has nothing left to close, only to confirm.

**Recently completed** (2026-08-07, sixteenth pass — Phase 10, real-time SSE delivery): a
streaming Route Handler (`src/app/api/events/stream/route.ts`) proxying the backend's `GET
/events/stream` (a NestJS `@Sse` endpoint) — checked
`node_modules/next/dist/docs/01-app/02-guides/streaming.md` before assuming this Next
version's Route Handlers support a bare `new Response(stream)`, confirmed they do — and a
new `<LiveEvents />` client component mounted on the dashboard and `(dashboard)/assets`.
**Two real findings made while building it, neither anticipated in the plan text:** (1)
NestJS's `@Sse` sends every frame through `EventSource`'s default `onmessage` with no
`event:`/`type` field at all (verified against `backend/src/events/events.service.ts`), so
a new `classifyLiveEvent()` helper (`src/lib/live-events.ts`) has to infer create/assign/
status-changed/unassign/delete from which fields are present on each payload instead of a
discriminator the backend never sends. (2) within that, `status_changed` and `unassigned`
turned out to be the _same_ payload shape on the wire (`RecordStatusChangedPayload`,
confirmed against `backend/src/asset/asset.service.ts`) — genuinely indistinguishable from
each other, not a gap in the classifier. Given that and the cost of hand-patching
Server-Component-sourced table state, live updates are built as a debounced (500ms)
`router.refresh()` on every classifiable frame — a real re-render against real backend
data — rather than synthetic client-side row construction; only the "toast on a new
critical event" behavior is built exactly as specified. Decision 3's Phase 10 revisit
question (does a 15-minute access token matter for a long-lived SSE connection) is resolved
as "no fix needed" — the backend's `@Sse` guard runs once at connect time, confirmed
directly against the controller, so this isn't a gap to patch. Test suite grew from 243 to
264 tests (`events-stream-route.test.ts`, `live-events-lib.test.ts`,
`live-events.test.tsx` — the streaming route's non-streaming-specific behavior, the
classifier's full decision table, and the client component against a mock `EventSource`,
deliberately not a full live-stream test per the plan's own note that real streaming is
better verified live); `tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all
verified clean.

**Recently completed** (2026-08-07, fifteenth pass — Phase 9, asset feed and dashboard
integration): the last mock data in the app is gone. A new `(dashboard)/assets` page (`GET
/assets/feed`, severity/assignedToMe/date-range filters, `NextOnlyPagination`) and a shared
`FeedTable` component (`src/components/assets/`) that both that page and the dashboard's
"recent activity" panel now render. The dashboard's four KPIs, severity breakdown, and
second breakdown panel are all real now too — a genuine design pass (decision 10), not a
find-and-replace: **Critical events**/**High severity**/**Open records** (new
`isOpenFeedEntry()` helper, source-aware since each module's terminal status values differ)
/**Assigned to me** replace the old mock KPIs, all counted over one `GET /assets/feed?
pageSize=100` snapshot with the dashboard's own copy saying exactly that ("based on the N
most recent events") rather than implying a full history no endpoint here can back (see
"Known gaps" — no module's query returns a total count). Two real findings made during the
design pass, neither anticipated in the original plan text: (1) the mock's fourth KPI,
"resolved today", turned out to have **no honest replacement at all** —
`AssetFeedEntry.timestamp` is the record's creation time, never updated on a status change
(confirmed against `backend/src/asset/asset.service.ts`'s `applyStatusChange`), so there's
no way to answer "resolved today" without a backend schema change; dropped rather than
faked, replaced with "Assigned to me". (2) confirmed via a full read of the relevant Prisma
models that `mockTopAttackSources` never had a real backend equivalent (no module stores a
structured attacker-IP field) — dropped and replaced with a new `EventsByModule` panel
(event volume by source module, real data, same visual). `src/lib/mock-data.ts` is fully
deleted — Phase 9 was its last consumer. Test suite grew from 233 to 243 tests
(`assets-feed-route.test.ts`, `asset-feed-lib.test.ts`); `tsc --noEmit`, `eslint`,
`prettier --check`, and `next build` all verified clean, `/assets` and `/api/assets/feed`
both confirmed in the build's route table.

**Recently completed** (2026-08-07, fourteenth pass — Phase 8, DFIR module, closing out all
six security modules): the sixth and last module page, and the one with real structural
complexity the other five didn't have — a genuine detail page
(`(dashboard)/dfir/[id]`, the only module with one, per decision 8) showing an incident's
full `DfirLink[]` trace back to whatever record across the other five modules led to it,
plus a manual link-record form with a raw UUID input (no id-typeahead endpoint exists —
noted as a real limitation, not built past what the backend supports) and an unlink action
per row. The nested dynamic route for unlinking
(`dfir/incidents/[id]/links/[linkId]`) proved Phase 2's `proxyToBackend()` helper handles a
two-segment dynamic path with no changes needed. Both the list and detail pages reuse the
shared `AssignmentControl`/`StatusTransitionMenu` — DFIR's status route is a genuine
restricted transition set (`ESCALATED`/`CONTAINED`/`RESOLVED`), the same shape SIEM/EDR use.
**With this phase, all six security modules (VM, EDR, SIEM, CTI, SOAR, DFIR) have real,
backend-wired frontend pages** — the single largest gap this file tracked since 2026-08-06
is closed; what's left of the adaptation plan is Phases 9-13 (asset feed/dashboard
integration, SSE, tenant module activation UI, RBAC/nav polish, and a final verification
pass), none of which are new module work. Test suite grew from 216 to 233 tests;
`tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all verified clean.

**Recently completed** (2026-08-07, thirteenth pass — Phase 7, SOAR module): the fifth
module page, and the first with genuinely different RBAC from every other module — SOAR's
playbook mutation routes are `@Roles(ADMIN)` only, not the `ADMIN`/`ANALYST` pattern every
other module uses, confirmed against the controller and reflected in a dedicated
`requireAdmin` guard (not `requireAnalystOrAdmin`) plus an Analyst-gets-no-actions-column
`PlaybooksTable`. `actions` stays a raw JSON textarea per the plan (SOAR execution is
simulated, no real action schema exists to build a structured form against) — a real
testing snag surfaced while covering it: `userEvent.type()`'s keyboard DSL treats `{`/`}`
as special-sequence syntax, making raw JSON input unreliable to type correctly even with
doubled-brace escaping, so `fireEvent.change()` was used to set the JSON textarea's value
directly in those specific assertions. Executions are read-only for every role — confirmed
no assign/status routes exist for `SoarExecution` at all. Test suite grew from 201 to 216
tests; `tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all verified clean.

**Recently completed** (2026-08-07, twelfth pass — Phase 6, CTI module): the fourth module
page and the first one with real create/edit forms but no status or assign concept at all —
confirmed CTI has neither a status route nor an assign route, so this is the first module
page with no `AssignmentControl`/`StatusTransitionMenu` anywhere in it. `IocRowActions`'
edit dialog deliberately has no type/value fields, matching `UpdateCtiIocDto`'s own "these
are the IOC's identity" comment — those two fields are set once at creation and never
touched again short of delete-and-recreate. The date-range filter uses a plain
`<input type="date">` submitting `YYYY-MM-DD`, which the backend's `@Type(() => Date)`
parses without needing a full client-built ISO timestamp. Test suite grew from 188 to 201
tests; `tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all verified clean.

**Recently completed** (2026-08-07, eleventh pass — Phase 5, SIEM module): the third module
page — real alerts list, replacing what the mock dashboard alerts table was standing in
for, plus a raw-logs page. The Phase 5 checklist explicitly flagged a genuine open
question (does `GET /siem/logs` deserve its own page, or is it not worth building before a
real user asks) rather than deciding it silently either way; asked directly, answered
"build both" — `(dashboard)/siem` (alerts, same filter set as VM: severity/status/"assigned
to me") and `(dashboard)/siem/logs` (read-only, unpaginated, no row actions — no such route
exists for `SiemLog`). SIEM's alert status route is a restricted `ESCALATED`/`RESOLVED` set
like EDR's, so it reuses the shared `StatusTransitionMenu` directly, same as EDR did. Test
suite grew from 179 to 188 tests; `tsc --noEmit`, `eslint`, `prettier --check`, and
`next build` all verified clean.

**Recently completed** (2026-08-07, tenth pass — Phase 4, EDR module): the second module
page, following Phase 3's pattern closely — see Phase 4 of the adaptation plan for the full
checklist. Two things worth remembering that VM didn't need: EDR's list filters are narrower
than VM's (`EdrQueryDto` has no `status` field, only VM's does — the page's filter set
matches that instead of copy-pasting VM's), and EDR's detection status route genuinely is
restricted to `ESCALATED`/`RESOLVED`, so this module uses Phase 2's shared
`StatusTransitionMenu` directly instead of a module-specific menu like VM's. No create form
for endpoints (no manual create route exists, only `ingest()`'s upsert). Test suite grew
from 164 to 179 tests; `tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all
verified clean.

**Recently completed** (2026-08-07, ninth pass — Phase 3, VM module): the first real
security-module page, closing the single largest remaining gap called out below (see Phase 3
of the adaptation plan for the full checklist). `(dashboard)/vm` (vulnerabilities, filters,
pagination) and `(dashboard)/vm/assets` (asset CRUD) are both real, backend-wired pages now —
the `[module]` stub no longer covers VM specifically, though it's untouched for the other
five. Built a VM-specific `VulnerabilityStatusMenu` instead of reusing Phase 2's shared
`StatusTransitionMenu`, confirming during Phase 2 that VM's status route takes the full enum
rather than a restricted transition set. Real constraint found along the way (not in the
original plan): `GET /users` is Admin-only on the backend, so only an Admin session can
resolve an assignee's name — Analyst/Viewer sessions on the VM page never call it, avoiding a
guaranteed 403; this applies to every later module's list page, not just VM's. Test suite
grew from 143 to 164 tests; `tsc --noEmit`, `eslint`, `prettier --check`, and `next build`
all verified clean.

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
on the backend). `RenameTenantButton` (Phase 11, 2026-08-07) now wires `PATCH
/tenants/:id` up too. The tenant detail page also gained a full "Modules" section the same
phase — `TenantModulesTable`/`ActivateModuleForm`/`TenantModuleRowActions` cover the
complete `TenantModule` CRUD surface (`GET/POST/PATCH/DELETE /tenants/:id/modules
[/:moduleName]`), the "which modules is this tenant subscribed to" activation model
described in root `../CLAUDE.md` — previously every tenant created through the real API had
zero active modules with no way to change that (see `backend/CLAUDE.md`'s "Full completeness
scan" entry, finding 1); that's no longer true. Nothing outstanding for what was built.

## Security modules, asset feed, and real-time delivery (SIEM, SOAR, CTI, EDR, DFIR, VM)

**All six modules are fully built on both the backend (since 2026-08-06) and now the
frontend too (Phases 3-8, all done 2026-08-07 in one continuous session — see each phase's
own entry in the adaptation plan below for what shipped and what was found along the way).**
`vm`, `edr`, `siem`, `cti`, `soar`, and `dfir` all have real pages, real Route Handlers (all
via the shared `proxyToBackend()`), and real types under `src/`. The old
`(dashboard)/[module]/page.tsx` placeholder stub and `src/lib/nav.ts`'s `isModuleSlug` guard
are both deleted (Phase 12, 2026-08-07) — every module's nav link has resolved to a real
page since Phase 8. **The asset aggregator (`GET
/assets/feed`) is wired to real data too, as of Phase 9 (2026-08-07)** —
`(dashboard)/assets` (the full paginated/filterable feed) and the dashboard's own
KPIs/breakdown panels/recent-activity table all consume it now; `src/lib/mock-data.ts` is
deleted. **The SSE event stream (`GET /events/stream`) is live too, as of Phase 10
(2026-08-07)** — `<LiveEvents />` (`src/components/security/live-events.tsx`) drives a
critical-event toast and a debounced live refresh on the dashboard and `(dashboard)/assets`.
Full phased plan, decisions, and verified API contract are in the dedicated section below,
"Backend to frontend adaptation plan (2026-08-06)". Do not re-derive the backend route list
by hand when picking up Phase 12 onward, the plan already has it verified against the
actual controller source, re-verify only if the backend has changed since 2026-08-06 (or
2026-08-07's hardening note, already folded in).

## Testing

46 files / 289 tests (`jest.config.ts`, `__tests__/`, `npm test`): `proxy.ts`'s full redirect
matrix, every auth/user/tenant form's validation/success/error paths (incl.
`RequestPasswordChangeForm`, added 2026-07-28), `UserRowActions`' four dialogs,
`UsersTable`/`TenantAdminsTable`'s pending-reset badge/tint logic, `ResetAdminPasswordButton`,
the full refresh-token migration (`auth-token-refresh.test.ts`, added 2026-08-07 —
`refreshAccessToken()`, `backendFetchAuthed`'s retry-on-401, and the login/refresh/logout
Route Handlers' cookie relay), Phase 2's shared foundation (`vm-assets-route.test.ts`,
`query-filters.test.ts`, `next-only-pagination.test.tsx`, `assignment-control.test.tsx`,
`status-transition-menu.test.tsx`, added 2026-08-07), Phase 3's VM module
(`vm-routes.test.ts`, `create-asset-form.test.tsx`, `asset-row-actions.test.tsx`,
`vulnerability-status-menu.test.tsx`, added 2026-08-07), Phase 4's EDR module
(`edr-routes.test.ts`, `endpoint-row-actions.test.tsx`, added 2026-08-07), Phase 5's SIEM
module (`siem-routes.test.ts`, added 2026-08-07), Phase 6's CTI module
(`cti-routes.test.ts`, `create-ioc-form.test.tsx`, `ioc-row-actions.test.tsx`, added
2026-08-07), Phase 7's SOAR module (`soar-routes.test.ts`, `create-playbook-form.test.tsx`,
`playbook-row-actions.test.tsx`, added 2026-08-07), Phase 8's DFIR module
(`dfir-routes.test.ts`, `link-record-form.test.tsx`, `links-table.test.tsx`, added
2026-08-07 — closing out all six modules), Phase 9's asset feed integration
(`assets-feed-route.test.ts`, `asset-feed-lib.test.ts`, added 2026-08-07 — the new Route
Handler's auth/RBAC/filter-forwarding/error-normalization paths, plus `isOpenFeedEntry()`'s
per-source terminal-status logic and `hrefForFeedEntry()`'s DFIR-vs-everything-else mapping;
no dedicated component test for `FeedTable`/`EventsByModule`/`SeverityBreakdown`, same
"read-only composition, no interactive logic of its own" precedent as Phase 5's
`AlertsTable`/`LogsTable`), Phase 10's real-time SSE delivery
(`events-stream-route.test.ts` — the streaming Route Handler's auth guard, error
passthrough, and a real-`ReadableStream` success path, deliberately not a full live-stream
test per the plan's own note that byte-for-byte streaming is better verified live;
`live-events-lib.test.ts` — `classifyLiveEvent()`'s full decision table plus
`describeCreatedEvent()`/`severityOf()`; `live-events.test.tsx` — the `<LiveEvents />`
client component against a small mock `EventSource`, covering toast-only-on-critical,
debounced-refresh-on-every-classifiable-frame, burst-coalescing, ignoring unrecognized
frames, and connection cleanup on unmount, added 2026-08-07), Phase 11's tenant module
activation UI (extended `tenants-routes.test.ts` with `PATCH /api/tenants/:id` and the full
modules CRUD surface, plus `rename-tenant-button.test.tsx`, `activate-module-form.test.tsx`,
`tenant-module-row-actions.test.tsx`, added 2026-08-07), and — the gap called out below
in earlier passes — every
Route Handler under `/api/users/**` and `/api/tenants/**`, using a `jest.mock("next/headers")`
cookie-store mock plus `fakeToken()` (in `test-utils.ts`) to build a syntactically valid
unsigned JWT for the session cookie (see `src/lib/jwt.ts`'s doc comment for why an unsigned
token is safe to use in tests — this file never verifies signatures either).
**`__tests__/`, `__mocks__/`, and `docs/` were all gitignored — fixed 2026-08-08, Phase
13's verification pass.** First found 2026-07-28 (as `__tests__/` alone), left unfixed
across every subsequent pass that mentioned it (including, incorrectly, one that claimed it
was "closed" — see the internship report's own Phase 13 entry for that correction), and
only actually fixed now: real `git ls-files`/`git check-ignore` verification (not assumed)
showed all three directories had zero tracked files and zero git history the entire time,
meaning every test-count claim in this section, and every `docs/internship-report-
frontend.md` narrative update made all session, described files that were never once
committed. `.gitignore`'s `__mocks__`/`__tests__`/`docs` lines are now removed; nothing
sensitive found in `docs/` before doing so (checked directly, not assumed — the one
`JWT_SECRET` mention there is prose naming the env var, not a value). **Not staged or
committed by this session** — per this project's own "commit only when asked" convention,
that's the user's call; flagged explicitly rather than silently `git add`-ed. Still missing,
roughly in order of value:

- [x] **Playwright e2e suite — done 2026-08-19.** `frontend/e2e/` (17 tests, `npm run
      test:e2e`), real Chromium against the real dev stack (frontend + backend + seeded
      Postgres) — not mocked, the genuine "next step up" from the Jest suite's mocked
      Route Handlers. Covers login/logout/forgot-password, RBAC (Viewer read-only, Analyst
      self-assign-only), full Super Admin tenant CRUD including the forced-first-login
      redirect, full Admin user CRUD including reset-forces-change-again, and one real
      mutation per module (SIEM assign+escalate, VM status lifecycle, CTI IOC, SOAR
      playbook, DFIR detail). Auth reuses a `storageState` per role (`e2e/auth.setup.ts`)
      rather than logging in fresh in every test — not just a speed optimization: found
      live that `AuthController`'s 5-requests/60s throttle (shared across login/refresh/
      logout/forgot-password) blocks the *entire* controller for a full 60s once tripped,
      and a naive one-login-per-test suite trips it almost immediately. `e2e/helpers.ts`'s
      `paceAuthCall()` doc comment has the full account, including two subtler bugs found
      chasing this down and fixed along the way: `browser.newContext()` silently inherits
      the calling test's `storageState` unless explicitly cleared (a "isolated" second
      login context wasn't isolated at all until this was found), and `dependencies:
      ["setup"]` gives the setup/chromium projects separate worker processes, so an
      in-memory rate-limit timestamp had to become a shared file instead. `backend/prisma/
      seed-modules.ts` gained `faker.seed(20260819)` the same day specifically so this
      suite's fixtures (`e2e/fixtures/accounts.ts`) could hardcode real seeded identities —
      see that file's own CLAUDE.md entry. Verified reliable, not just "it passed once":
      two consecutive full runs, 17/17 both times, ~2.9 minutes each, database left in the
      same clean 5-tenant/40-user state it started in either way (every test cleans up its
      own ephemeral tenant/IOC/playbook/user in a `finally` block).
- [ ] Jest's default per-test timeout was raised to 15s (`jest.config.ts`) after observing
      real flakiness under WSL2 CPU contention when the full suite runs in parallel workers
      (a file that takes ~2s in isolation exceeded 5s under load, and a killed-mid-test
      `userEvent.type` call leaked keystrokes into the next test). Worth revisiting if the
      suite grows large enough that 15s stops being enough headroom, or if this turns out to
      be WSL2-specific and CI runs on different infrastructure.
- ~~Once the adaptation plan below lands, the test count needs to grow proportionally~~
  **Done — the adaptation plan itself is complete as of Phase 13 (2026-08-08).** The
  predicted "double or triple" happened: 110 tests before Phase 1 started, 289 now. Left
  struck through rather than deleted per this file's own convention.

## Platform readiness (2026-08-19)

The frontend is functionally complete and live-tested against a real seeded backend, not
just built against mocks: every page wired to real data since the adaptation plan finished
(Phase 13, 2026-08-08), the favicon/brand mark replaced with a designed asset, the
TypeScript 6.0.3 spec/installed mismatch resolved, and a real Playwright E2E suite added on
top of the 289-test Jest/RTL suite (`e2e/`, covering auth, RBAC, tenant/user CRUD, and all
six security modules end-to-end through the real backend). A full manual QA pass through the
browser (login/lockout, every module's UI, the orchestration chain, live SSE updates via the
dashboard/asset feed, RBAC across all 4 roles) confirmed everything works as built. `tsc
--noEmit`, `eslint --max-warnings=0`, `prettier --check`, `next build`, and the full test
suite are all clean.

What's left is infrastructure, not functionality — same two items as `backend/CLAUDE.md`'s
own "Platform readiness" entry: **no Dockerfile** (`docker-compose.yml` only runs Postgres)
and **no CI/CD** here at all yet (the backend at least has test-only CI; the frontend's own
289+E2E test suite currently only runs when someone remembers to `npm test`/`npm run
test:e2e`). See the itemized list right below for those plus the smaller already-tracked
polish items (no pre-commit hooks, per-segment `loading.tsx` gaps) — none of them are
functional gaps, all are deliberate/tracked.

## Polish / infra

- [ ] **No CI.** The backend has `.github/workflows/test.yml` running its suite on every
      push; the frontend's 289-test suite currently only runs when someone remembers to
      type `npm test`. Scoped out of the 2026-07-16 hygiene pass at the user's explicit
      direction, not forgotten — now that `__tests__/`/`__mocks__/`/`docs/` are actually
      tracked in git (Phase 13, 2026-08-08), a workflow file can finally run something real
      instead of zero files; do this next if picking one item off this list.
- [ ] No Dockerfile on either side of the repo yet (docker-compose.yml is Postgres-only) —
      not a frontend-specific gap, noted for completeness.
- [ ] No husky/pre-commit hooks on either side — `format:check`/lint/typecheck only run
      manually or (once built) in CI, not before a commit lands locally.
- [x] Resolve the TypeScript 6.0.3 (spec) vs 5.9.3 (installed) discrepancy — **done
      2026-08-19**, see "Stack" above: 6.x is real and stable, installed and fully
      re-verified.
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
:id/reset-password` (Admin, Super Admin), `DELETE :id` (Admin). All wired on the frontend
  except **`GET :id`, which has no Route Handler and no caller anywhere** (confirmed by
  grep during Phase 13's verification pass, 2026-08-08) — not a gap, just genuinely unused:
  `UserRowActions`' edit dialog already has the full user object as a prop from the list
  page's one `GET /users` fetch, so no separate per-user detail fetch was ever needed. `GET
me` and `GET me/pending-password-requests` aren't proxied through a Route Handler either,
  by design — both are only ever called directly from a Server Component
  (`(dashboard)/layout.tsx` via `backendFetchAuthedNoRefresh`), never from client-side JS,
  so there's nothing for a Route Handler to sit in front of. See "User management" above
  for everything that is genuinely wired.
- **Tenants** (`/tenants`, class-level Super Admin): `POST`, `GET`, `GET :id` (backend-direct
  from the Server Component `tenants/[id]/page.tsx`, same no-Route-Handler-needed pattern as
  `GET /users/me`), `PATCH :id` (rename, Phase 11), `DELETE :id`, `GET :id/modules` (Phase
  11), `POST :id/modules` (Phase 11), `PATCH :id/modules/:moduleName` (Phase 11), `DELETE
:id/modules/:moduleName` (Phase 11) — every route here is wired now; see "Tenant
  management" above.
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

## Phase 3, VM module — DONE 2026-08-07

- [x] `src/app/(dashboard)/vm/page.tsx`: vulnerabilities list (severity, description, CVE,
      resolved asset name/ip, status, assignee), filters (severity, status via plain
      `<select>`s in a native GET `<form>` — not shadcn's `Select`, which doesn't submit as
      part of a native form — plus an "assigned to me" checkbox using the session's own
      `userId`), `NextOnlyPagination`. Resolves each vulnerability's `assetId` against a
      second `GET /vm/assets` call (cheap, unpaginated) rather than showing a bare id.
- [x] `src/app/(dashboard)/vm/assets/page.tsx`: asset list + create form (Admin, Analyst) +
      `AssetRowActions` (edit / delete, delete surfaces the backend's `409` message as-is
      when vulnerabilities still reference the asset — hidden entirely for Viewer).
- [x] Row actions: `AssignmentControl` (shared, Phase 2) for assign/unassign; a **new
      VM-specific** `VulnerabilityStatusMenu` (`src/components/vm/`), not the shared
      `StatusTransitionMenu` — confirmed during Phase 2 that VM's `PATCH
vulnerabilities/:id/status` takes the full `VmVulnerabilitiesStatus` enum rather than a
      restricted transition subset, so this menu offers all statuses except the current one,
      not a fixed target list. Both hidden for Viewer.
- [x] Zod schemas: `createVmAssetSchema`/`updateVmAssetSchema` (Phase 2) plus new
      `updateVulnerabilityStatusSchema` (`src/lib/validations/vm.ts`) and a shared
      `assignPayloadSchema` (`src/lib/validations/security.ts`, mirrors `AssignDto`, reusable
      by every later module's assign routes too).
- [x] Route Handlers, all via `proxyToBackend()`: `vm/assets/[id]` (`PATCH`/`DELETE`, on top
      of Phase 2's `vm/assets` `GET`/`POST`), `vm/vulnerabilities` (`GET`),
      `vm/vulnerabilities/[id]/status` (`PATCH`), `vm/vulnerabilities/[id]/assign`
      (`POST`/`DELETE`).
- [x] **Real constraint found, not in the original plan:** `GET /users` (used to resolve
      `assignedToUserId` to a name, and to populate `AssignmentControl`'s Admin picker) is
      `@Roles(ADMIN)`-gated on the backend — an Analyst or Viewer session can't call it. The
      VM page only fetches it for an Admin session; Analyst still gets a working "Assign to
      me" (needs no list) and Viewer sees no assign control at all, but neither role can see
      an assignee's _name_, only `AssignmentControl`'s "Assigned" fallback. Documented in the
      page's own comment rather than silently sending a request that would 403. This applies
      to every later module's list page too, not just VM.
- [x] Tests: `vm-routes.test.ts` (10, the four new Route Handlers' RBAC/success/error paths;
      `vm-assets-route.test.ts` from Phase 2 already covers `vm/assets` itself),
      `create-asset-form.test.tsx` (3), `asset-row-actions.test.tsx` (4, edit + delete +
      409), `vulnerability-status-menu.test.tsx` (4). 21 new tests. Full suite: 164 tests
      (was 143), all green; `tsc --noEmit`, `eslint`, `prettier --check`, and `next build`
      all clean (same one pre-existing, unrelated `eslint` finding, still untouched).
      Verified via the build's route table that the new static `vm/` and `vm/assets/` routes
      take precedence over the dynamic `[module]/` stub, as Next's own routing rules say they
      should — the stub itself is left in place for the other five modules, per Phase 12.

## Phase 4, EDR module — DONE 2026-08-07

- [x] `src/app/(dashboard)/edr/page.tsx`: detections list (severity, detection name +
      description, MITRE techniques, resolved endpoint hostname, status, assignee).
      **Filter set is narrower than VM's, not a copy-paste "same as VM"**: `EdrQueryDto`
      (unlike `VmQueryDto`) adds only `endpointId` to the shared `BaseQueryDto`, no `status`
      — so the page only offers severity + "assigned to me", matching what the backend
      actually supports rather than building a status filter that would silently do nothing.
- [x] `src/app/(dashboard)/edr/endpoints/page.tsx`: endpoint list (hostname, ip, os, status,
      last seen), edit + delete only — **no create form**, confirmed no manual create route
      exists (`EndpointRowActions`, no equivalent of VM's `CreateAssetForm`). Delete's `409`
      (still has detections) surfaces the backend's own message as-is, which already names
      `DECOMMISSIONED` as the alternative — nothing extra needed in the UI copy.
- [x] Row actions: `AssignmentControl` (shared) for assign/unassign. Status change uses the
      **shared `StatusTransitionMenu`** this time, unlike VM — `UpdateEdrDetectionStatusDto`
      really is restricted to `ESCALATED`/`RESOLVED`
      (`EDR_DETECTION_TRANSITIONABLE_STATUSES`), the exact shape that component was built
      for.
- [x] Zod schemas: `updateEdrEndpointSchema`, `updateEdrDetectionStatusSchema`
      (`src/lib/validations/edr.ts`), reusing Phase 3's shared `assignPayloadSchema`.
- [x] Route Handlers, all via `proxyToBackend()`: `edr/endpoints` (`GET` only — no `POST`),
      `edr/endpoints/[id]` (`PATCH`/`DELETE`), `edr/detections` (`GET`),
      `edr/detections/[id]/status` (`PATCH`), `edr/detections/[id]/assign`
      (`POST`/`DELETE`).
- [x] Tests: `edr-routes.test.ts` (11), `endpoint-row-actions.test.tsx` (4). 15 new tests.
      Full suite: 179 tests (was 164), all green; `tsc --noEmit`, `eslint`,
      `prettier --check`, and `next build` all clean (same one pre-existing, unrelated
      `eslint` finding, still untouched). Confirmed via the build's route table that
      `AssignmentControl`'s Admin-picker constraint from Phase 3 (`GET /users` being
      Admin-only) applies identically here — same comment, same fetch-only-if-Admin guard,
      not rediscovered from scratch.

## Phase 5, SIEM module — DONE 2026-08-07

- [x] `src/app/(dashboard)/siem/page.tsx`: alerts list (severity, title/description, MITRE,
      status, assignee), same filter set as VM (severity, status, "assigned to me") —
      `SiemQueryDto`, like `VmQueryDto`, adds `status` on top of the shared `BaseQueryDto`,
      unlike EDR's narrower set. **The `GET /siem/logs` question was asked explicitly rather
      than silently decided either way** (see this session's own transcript) — answer: build
      it, as `src/app/(dashboard)/siem/logs/page.tsx`, read-only and unpaginated (`listLogs`
      takes no query params or pagination on the backend at all), no row actions (no
      PATCH/DELETE route exists for `SiemLog`).
- [x] Row actions: `AssignmentControl` + shared `StatusTransitionMenu`
      (`ESCALATED`/`RESOLVED` only, same restricted shape as EDR's, not VM's full-enum one).
- [x] Zod schema: `updateSiemAlertStatusSchema` (`src/lib/validations/siem.ts`), reusing the
      shared `assignPayloadSchema`. No create schema — alerts and logs both only appear via
      `ingest()`, same as EDR's endpoints.
- [x] Route Handlers, all via `proxyToBackend()`: `siem/logs` (`GET` only), `siem/alerts`
      (`GET`), `siem/alerts/[id]/status` (`PATCH`), `siem/alerts/[id]/assign`
      (`POST`/`DELETE`).
- [x] Tests: `siem-routes.test.ts` (9). No new component-level test file needed —
      `AlertsTable`/`LogsTable` compose only already-tested shared components
      (`AssignmentControl`, `StatusTransitionMenu`) or render read-only data with no
      interactive logic of their own, matching the precedent set by `VulnerabilitiesTable`/
      `DetectionsTable`/`EndpointsTable`/`AssetsTable` (Phases 3-4), none of which have
      dedicated test files either — only the interactive components they compose do. Full
      suite: 188 tests (was 179), all green; `tsc --noEmit`, `eslint`, `prettier --check`,
      and `next build` all clean (same one pre-existing, unrelated `eslint` finding, still
      untouched).

## Phase 6, CTI module — DONE 2026-08-07

- [x] `src/app/(dashboard)/cti/page.tsx`: IOC list (type, value, confidence, source), filter
      by type plus the shared date range (native `<input type="date">`, submitted as
      `YYYY-MM-DD` — the backend's `@Type(() => Date)` parses that fine, no need to build a
      full ISO timestamp client-side), `NextOnlyPagination`. **No severity/assignedToUserId
      filters** — confirmed `CtiIoc` has neither field, and `CtiService.query()` silently
      ignores those two inherited `BaseQueryDto` fields when present, so the page never
      sends them (documented in the Route Handler's own comment, not just assumed).
- [x] Create (Admin, Analyst) via `CreateIocForm`; `IocRowActions` edits confidence/source
      only — no type/value fields in the dialog at all, matching `UpdateCtiIocDto`'s own
      "these together are the IOC's identity" comment; delete.
- [x] Zod schemas: `createCtiIocSchema`, `updateCtiIocSchema` (`src/lib/validations/cti.ts`).
- [x] Route Handlers, all via `proxyToBackend()`: `cti/iocs` (`GET`/`POST`), `cti/iocs/[id]`
      (`PATCH`/`DELETE`).
- [x] **CTI is the one module with neither a status route nor an assign route** — no
      `AssignmentControl`, no `StatusTransitionMenu` anywhere in this module, confirmed
      against the controller rather than assumed from the other modules' shape.
- [x] Tests: `cti-routes.test.ts` (7), `create-ioc-form.test.tsx` (2),
      `ioc-row-actions.test.tsx` (4, including a check that the edit dialog has no
      type/value fields at all). 13 new tests. Full suite: 201 tests (was 188), all green;
      `tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all clean (same one
      pre-existing, unrelated `eslint` finding, still untouched).

## Phase 7, SOAR module — DONE 2026-08-07

- [x] `src/app/(dashboard)/soar/page.tsx`: two sections, playbooks and executions (the
      latter paginated via `NextOnlyPagination`, the former unpaginated — `listPlaybooks`
      takes no query params at all on the backend, same shape as VM's assets/EDR's
      endpoints).
- [x] Playbook CRUD, **Admin only** (not Admin-or-Analyst like every other module's
      mutations — `SoarController`'s playbook routes are `@Roles(ADMIN)` specifically):
      create/edit via `CreatePlaybookForm`/`PlaybookRowActions` with a severity-only
      `triggerCondition` picker (a single `Severity` `<Select>`, matching
      `TriggerConditionDto` exactly, not a free-form condition builder), an `actions` field
      that's a raw JSON `<textarea>` (parsed client-side before zod validation; a
      `JSON.parse` failure shows "Enter valid JSON" without ever reaching the schema),
      `isActive` toggle (plain checkbox — no `Switch` primitive in this shadcn preset),
      delete (409 surfaces the backend's own "deactivate it instead" message as-is).
      Analyst/Viewer get `PlaybooksTable` with no actions column at all — not just a
      disabled one.
- [x] Executions list, read-only for every role — confirmed no assign/status routes exist
      for `SoarExecution` in the controller, so no `AssignmentControl`/`StatusTransitionMenu`
      anywhere in `ExecutionsTable` either, same as `LogsTable` in Phase 5.
- [x] Zod schemas: `triggerConditionSchema`, `createSoarPlaybookSchema`,
      `updateSoarPlaybookSchema` (`src/lib/validations/soar.ts`) — `actions` validated as
      `z.record(z.string(), z.unknown())`, matching the backend's own unconstrained
      `@IsObject()`.
- [x] Route Handlers, all via `proxyToBackend()`: `soar/playbooks` (`GET`/`POST`, `POST`
      guarded by `requireAdmin` not `requireAnalystOrAdmin`), `soar/playbooks/[id]`
      (`PATCH`/`DELETE`, same Admin-only guard), `soar/executions` (`GET`).
- [x] Tests: `soar-routes.test.ts` (8, including the Admin-only RBAC distinction vs. every
      other module), `create-playbook-form.test.tsx` (3, incl. invalid-JSON handling),
      `playbook-row-actions.test.tsx` (4, incl. pre-filling the JSON textarea and the
      isActive checkbox, plus the same invalid-JSON path on edit). **Testing note:**
      `userEvent.type()`'s keyboard DSL treats `{`/`}` as special-sequence delimiters, which
      makes typing raw JSON into the actions textarea unreliable to escape correctly — used
      `fireEvent.change()` to set the textarea's value directly in those specific
      assertions instead, keeping `userEvent` for every other interaction in the same
      tests. 15 new tests. Full suite: 216 tests (was 201), all green; `tsc --noEmit`,
      `eslint`, `prettier --check`, and `next build` all clean (same one pre-existing,
      unrelated `eslint` finding, still untouched).

## Phase 8, DFIR module — DONE 2026-08-07 (last of the six modules)

- [x] `src/app/(dashboard)/dfir/page.tsx`: incident list (severity, title/description,
      MITRE, status, assignee), same filter set as VM/SIEM (`DfirQueryDto` also adds
      `status` to the shared `BaseQueryDto`), `NextOnlyPagination`. Title links through to
      the detail page.
- [x] `src/app/(dashboard)/dfir/[id]/page.tsx`: the one real detail page per decision 8,
      incident fields plus its full `DfirLink[]` (source type, source id) via `LinksTable`,
      a manual "link an existing record" form (`LinkRecordForm`: `sourceType` select from
      `DfirLinkSourceType`'s six values, `sourceId` as a raw UUID input — confirmed no
      id-typeahead/search endpoint exists, a real limitation rather than over-built past
      what the backend supports), and an `Unlink` action per row (no confirm dialog, matching
      `AssignmentControl`'s Unassign — low-stakes, and idempotent re-linking exists if
      needed). 404s from the backend map to `notFound()`, matching the existing
      `(dashboard)/tenants/[id]` pattern.
- [x] Row actions on the list and the detail page, both: shared `AssignmentControl` +
      `StatusTransitionMenu` (`ESCALATED`/`CONTAINED`/`RESOLVED`, the three-value
      `DFIR_INCIDENT_TRANSITIONABLE_STATUSES`).
- [x] Zod schemas: `updateDfirIncidentStatusSchema`, `createDfirLinkSchema`
      (`src/lib/validations/dfir.ts`), reusing the shared `assignPayloadSchema`.
- [x] Route Handlers, all via `proxyToBackend()`: `dfir/incidents` (`GET`),
      `dfir/incidents/[id]` (`GET`, the detail route), `dfir/incidents/[id]/status`
      (`PATCH`), `dfir/incidents/[id]/assign` (`POST`/`DELETE`),
      `dfir/incidents/[id]/links` (`POST`), `dfir/incidents/[id]/links/[linkId]`
      (`DELETE`, `proxyToBackend()`'s `path` function receiving both `id` and `linkId` from
      the two-level dynamic segment without any change to the helper itself — proof the
      Phase 2 design handles nested dynamic routes for free).
- [x] Tests: `dfir-routes.test.ts` (11, incl. the two-dynamic-segment unlink route),
      `link-record-form.test.tsx` (2), `links-table.test.tsx` (4, incl. the detail page's
      link/unlink flow and hiding Unlink for Viewer). 17 new tests. Full suite: 233 tests
      (was 216), all green; `tsc --noEmit`, `eslint`, `prettier --check`, and `next build`
      all clean (same one pre-existing, unrelated `eslint` finding, still untouched;
      confirmed via the build's route table that both `/dfir` and `/dfir/[id]` registered
      correctly).
- [x] **All six security modules (VM, EDR, SIEM, CTI, SOAR, DFIR) now have real frontend
      pages.** The `(dashboard)/[module]` stub and `src/lib/nav.ts`'s `isModuleSlug` guard
      are now fully superseded — not deleted yet, that's Phase 12's explicit job (confirm
      nothing else still needs them first), but every module's nav link resolves to a real
      page now, not the placeholder.

## Phase 9, asset feed and dashboard integration — DONE 2026-08-07

- [x] `src/app/(dashboard)/assets/page.tsx` — decided explicitly (not defaulted): build a
      dedicated page, not a fold-into-dashboard. Every other module already gets its own
      list page with full filters/pagination, and the feed genuinely needs that (severity,
      "assigned to me", date range, `NextOnlyPagination`) — folding it into the dashboard
      would mean either a second, less-capable feed view or losing the dashboard's own
      compact "recent activity" glance. Instead the dashboard's "Recent activity" panel
      reuses the same `FeedTable` component with a small unpaginated slice
      (`RECENT_ACTIVITY_ROWS = 8`) of the same fetch, so both places share one real
      component instead of diverging. Each row shows severity, summary/type, source module
      (badge), status (raw per-source string), assignee, and a deep link — real DFIR rows
      link to their actual detail page (`/dfir/:id`, the one module with one, decision 8);
      everywhere else links to the owning module's list page, since no other module has a
      per-record route to link to (documented in `src/lib/asset-feed.ts`'s own comment, not
      invented past what the backend supports). New nav entry: "Asset Feed" under PLATFORM,
      tenant-scoped roles only (Super Admin has no `tenantId`, and `requireTenantId()` on
      the backend would 403 them the same way it already does elsewhere).
- [x] Replaced the old `src/lib/mock-data.ts`-backed severity breakdown and alerts table
      with real `GET /assets/feed` data — `SeverityBreakdown` and the dashboard's
      "Recent activity" `FeedTable` both now take real `AssetFeedEntry[]` as a prop.
      `mock-data.ts` itself is now fully deleted (2026-08-07) — Phase 9 was its last
      consumer, and CLAUDE.md had repeatedly warned not to keep extending it; once nothing
      used it, deleting it beat leaving a dead file around per the "don't let this drift"
      discipline this file has followed all along.
- [x] Replaced the four mock KPIs with a real design pass (decision 10), not a
      find-and-replace: **Critical events**, **High severity**, **Open records** (a new
      `isOpenFeedEntry()` helper in `src/lib/asset-feed.ts`, source-aware since each
      module's terminal status values differ — VM: `REMEDIATED`/`ACCEPTED_RISK`, DFIR:
      `CONTAINED`/`RESOLVED`, EDR/SIEM: `RESOLVED`; CTI/SOAR never set a `status` on their
      feed rows at all and are excluded rather than miscounted), and **Assigned to me**
      (replacing the old mock's "Resolved today", see below for why). All four are counted
      over one `GET /assets/feed?pageSize=100` fetch (the backend's own `@Max(100)` ceiling)
      — a snapshot of the most recent 100 events, not a true tenant-wide total (no module's
      `query()`/`getUnifiedFeed` returns a count, see "Known gaps"). The dashboard's own
      copy says exactly that ("Based on the N most recent events...") rather than implying
      a full history.
- [x] **Real finding made while doing this design pass, not anticipated in the original
      plan text:** the mock's fourth KPI, "Resolved today", has **no honest replacement at
      all** — `AssetFeedEntry` has no resolved-at/updated-at timestamp, only `timestamp`
      (the record's _creation_ time, set once and never touched again on a status change —
      confirmed directly against `backend/src/asset/asset.service.ts`'s `applyStatusChange`,
      which updates `status` but not `timestamp`). There is no way to answer "resolved
      today" from this schema without a backend change. Dropped rather than faked or
      silently kept, and replaced with "Assigned to me" — a KPI that _is_ honestly
      answerable from the fetched page and useful to the viewing analyst.
- [x] `mockTopAttackSources` — confirmed via a full read of the relevant Prisma models
      (`SiemLog`, `SiemAlert`, `EdrDetection`, `VmVulnerability`) that no module stores a
      structured attacker-source-IP field consistently enough to aggregate one
      (`SiemLog.source` is a free-text log-source name, not an attacker IP; the rest keep
      any IP-shaped data inside opaque `rawData` JSON). Dropped the panel rather than mark
      it illustrative — replaced with a new `EventsByModule` panel (same bar-list visual,
      real data: event volume by source module from the same feed fetch), so the dashboard
      keeps two real breakdown panels instead of one real and one fake-labeled-as-real.
- [x] Tests: `__tests__/assets-feed-route.test.ts` (4, the new Route Handler's
      auth/RBAC/filter-forwarding/error-normalization paths) and
      `__tests__/asset-feed-lib.test.ts` (6, `isOpenFeedEntry`'s per-source terminal-status
      logic and `hrefForFeedEntry`'s DFIR-vs-everything-else mapping). No dedicated
      component test file for `FeedTable`/`EventsByModule`/`SeverityBreakdown` — same
      precedent as Phase 5's `AlertsTable`/`LogsTable`: these are read-only, presentational
      compositions with no interactive logic of their own, and none of the six modules'
      list-only tables got a dedicated file either. 10 new tests. Full suite: 243 tests (was
      233), all green; `tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all
      clean (same one pre-existing, unrelated `eslint` finding in `user-row-actions.tsx`,
      still untouched). Confirmed via the build's route table that `/assets` and
      `/api/assets/feed` both registered correctly.

## Phase 10, real-time delivery (SSE) — DONE 2026-08-07

- [x] `src/app/api/events/stream/route.ts`: proxies the backend's `GET /events/stream`
      (a NestJS `@Sse` endpoint) straight through. Checked
      `node_modules/next/dist/docs/01-app/02-guides/streaming.md`'s "Streaming in Route
      Handlers" section before assuming this Next version's Route Handlers support a bare
      `new Response(stream)` — confirmed they do, no new API needed. Deliberately **not**
      built on `proxyToBackend()` — that helper calls `.json()` on the backend response,
      which would buffer an infinite stream forever before ever forwarding a byte. Instead
      forwards `backendFetchAuthed("/events/stream").body` (already a `ReadableStream`, no
      manual `TextEncoder`/chunk loop needed) with `Content-Type: text/event-stream`,
      `Cache-Control: no-cache, no-transform`, and `X-Accel-Buffering: no`.
- [x] `src/components/security/live-events.tsx`'s `<LiveEvents />`: a client component
      wrapping `new EventSource("/api/events/stream", { withCredentials: true })`, mounted
      on the Security Overview dashboard (`(dashboard)/dashboard`'s `TenantOverview` only —
      not `SuperAdminOverview`, which has no tenant to stream events for) and
      `(dashboard)/assets` (guarded there with an explicit `role !== SUPER_ADMIN` check,
      since that page has no upstream branch to rely on the way the dashboard does), per
      decision in this phase, not wired into every module list page in the same pass.
- [x] **Real finding made while building this, not anticipated in the original plan text:**
      NestJS's `@Sse` maps every event to `{ data: event }` with no `event:`/`type` field
      set (verified directly against `backend/src/events/events.service.ts`), so
      `EventSource` always delivers frames through its default `onmessage`, never a
      named-event listener — there is **no discriminator field on the wire** telling the
      frontend whether a frame is a create/assign/status-change/unassign/delete. Built
      `src/lib/live-events.ts`'s `classifyLiveEvent()` to infer the kind from which fields
      are present instead (verified against every payload shape in
      `backend/src/common/security-module/types.ts`): `assignedToUserId` (string) →
      `assigned`; `recordId` + `status` → `status_or_unassigned`; `recordId` with no
      `status` → `deleted`; `severity` with neither of the above → `created`. **A second,
      narrower finding inside that:** `status_changed` and `unassigned` events are
      genuinely indistinguishable from each other on the wire — both are the exact same
      `RecordStatusChangedPayload` shape (see `backend/src/asset/asset.service.ts`'s own
      comment on why one handler per module, not one payload per event name) — so the
      plan's "live status-pill updates on `*.assigned`/`*.status_changed`/`*.unassigned`
      frames" is only partially buildable as three _distinct_ behaviors; `assigned` is
      distinguishable, the other two are collapsed into one `status_or_unassigned` kind on
      purpose, not a bug.
- [x] **Live behavior, built as a deliberate simplification of the plan's literal wording,
      documented in `live-events.tsx`'s own comment:** rather than hand-patching individual
      rows in currently-rendered tables (`FeedTable` and, eventually, the six module
      tables — all Server-Component-sourced props today, not client state a delta could
      merge into without a much larger refactor), every classifiable frame triggers a
      **debounced `router.refresh()`** (500ms, coalescing bursts into one call) — a real
      re-render of the current route's Server Component against real backend data, not a
      synthetic row built from a partial SSE payload with no real `AssetFeedEntry.id` to key
      on. This achieves live-prepend/live-status-update in effect (the list updates within
      half a second of a real event, using real data every time) with far less risk of
      drift than hand-maintained client state — revisit only if `router.refresh()`'s
      full-tree re-render is ever a measured cost problem, not preemptively. The one
      behavior built exactly as specified: a `sonner` toast (`toast.error`, matching the
      severity color convention `AssignmentControl` already uses for its own error toasts)
      fires only on a new **critical**-severity `*.created` event, using a new
      `describeCreatedEvent()` helper that mirrors `AssetService`'s own per-source summary
      strings by hand (same hand-mirroring tradeoff as every other backend-shape mirror in
      this codebase).
- [x] No tenant-filtering logic needed client-side, confirmed —
      `EventsService.streamForTenant` filters server-side by design, and the browser's
      session cookie (same-origin, sent automatically to `/api/events/stream`) is what ties
      the backend connection to the right tenant in the first place.
- [x] **Decision 3 revisited, resolved as "no fix needed," not silently left open:** a
      long-lived open `EventSource` connection does keep receiving events past the access
      token's own 15-minute expiry, since the backend's `@Sse` guard chain runs once at
      connect time, not per emitted `MessageEvent` (confirmed directly against
      `backend/src/events/events.controller.ts` — no per-frame auth mechanism exists to
      revisit). This is a property of the backend's own guard model, not something the
      frontend can or should work around; documented in the Route Handler's own comment
      rather than left as an implicit assumption. The moment the connection actually drops
      for any reason (network blip, tab backgrounding, browser throttling), `EventSource`'s
      native reconnect hits this Route Handler fresh, and `backendFetchAuthed`'s existing
      lazy-refresh-on-401 covers a genuinely expired session at that point — no proactive
      client-side refresh timer was needed after all.
- [x] Tests: per the plan's own note that the Route Handler's real byte-streaming behavior
      is better verified live than faked with a mock, `events-stream-route.test.ts` covers
      only what's meaningfully testable without a live connection — the auth guard, the
      error-passthrough path, and (using a real `ReadableStream`, a genuine Node global, not
      a stand-in object) that a successful backend response's body and headers are forwarded
      correctly. `live-events-lib.test.ts` covers `classifyLiveEvent()`'s full decision
      table and `describeCreatedEvent()`/`severityOf()`. `live-events.test.tsx` covers the
      client component itself against a small mock `EventSource` class (jsdom has no real
      one) — toast-only-on-critical, debounced-refresh-on-every-classifiable-frame,
      burst-coalescing, ignoring unrecognized frames, and connection cleanup on unmount. 21
      new tests. Full suite: 264 tests (was 243), all green; `tsc --noEmit`, `eslint`,
      `prettier --check`, and `next build` all clean (same one pre-existing, unrelated
      `eslint` finding, still untouched). Confirmed via the build's route table that
      `/api/events/stream` registered correctly as a dynamic route.

## Phase 11, tenant module activation UI (Super Admin) — DONE 2026-08-07

- [x] `RenameTenantButton` next to `DeleteTenantButton` on `(dashboard)/tenants`
      (`TenantsTable`'s action column), wired to the new `PATCH /api/tenants/[id]` Route
      Handler — a dialog pre-filled with the current name, not a bare inline-edit, matching
      the dialog-based edit pattern every other rename/edit action in this app already uses
      (`UserRowActions`, `PlaybookRowActions`).
- [x] `(dashboard)/tenants/[id]` gains a "Modules" section: `TenantModulesTable` (module,
      status badge, a truncated one-line config preview, row actions) plus
      `ActivateModuleForm` (a `ModuleName` `<Select>` plus an optional raw JSON `config`
      textarea, matching `ActivateTenantModuleDto`'s shape exactly — same "no structured
      form, the backend accepts an open object" reasoning as SOAR's `actions` field).
      `TenantModuleRowActions` covers toggle `isActive` + edit `config` in one PATCH-backed
      edit dialog (mirroring `PlaybookRowActions`' isActive-toggle-plus-JSON-textarea shape
      closely) and remove (DELETE, confirm-dialog-gated like `DeleteTenantButton` — a
      TenantModule's config is real per-tenant integration state, not a delete-with-no-undo
      cost trivial enough to skip confirming, unlike DFIR's low-stakes Unlink).
- [x] **Small UX addition beyond the plan's literal text, not asked for but cheap and
      obviously correct:** `ActivateModuleForm`'s picker filters out modules the tenant
      already has a row for (`activateModule` 409s on a duplicate — `TenantModule` is
      one-row-per-tenant-per-module by a real unique constraint) rather than letting the
      form offer a choice guaranteed to fail; re-activating/reconfiguring an existing module
      is `TenantModuleRowActions`' edit dialog (PATCH), not this form.
- [x] Zod schemas mirroring `ActivateTenantModuleDto`, `UpdateTenantModuleDto`,
      `UpdateTenantDto` — `updateTenantSchema`, `activateTenantModuleSchema`,
      `updateTenantModuleSchema` in `src/lib/validations/tenants.ts`.
- [x] Route Handlers: `PATCH` added to the existing `src/app/api/tenants/[id]/route.ts`
      (hand-rolled, matching that file's existing `DELETE` — both predate
      `proxyToBackend()`, kept consistent within the one file rather than mixing patterns);
      `src/app/api/tenants/[id]/modules/route.ts` (`GET`/`POST`) and
      `src/app/api/tenants/[id]/modules/[moduleName]/route.ts` (`PATCH`/`DELETE`), both new
      and both via `proxyToBackend()` — the two-segment dynamic path worked with no changes
      to the helper, the same thing Phase 8's DFIR unlink route already proved. All five
      routes guarded by `requireSuperAdmin`, matching `TenantsController`'s class-level
      `@Roles(SUPER_ADMIN)`.
- [x] Tests: extended `tenants-routes.test.ts` with `PATCH /api/tenants/:id` and the full
      modules CRUD surface (13 new cases: RBAC, 400/404/409 paths, and success paths for
      each route), plus `rename-tenant-button.test.tsx` (3), `activate-module-form.test.tsx`
      (4, incl. the already-active-filter and the all-modules-configured empty state), and
      `tenant-module-row-actions.test.tsx` (4). One real accessibility gap caught while
      writing these, fixed in the component rather than worked around in the test: the edit
      dialog's config textarea had no associated `<label>` — added a `FieldLabel`, matching
      every other form field in this app, instead of leaving the test to reach for it by
      DOM structure alone. 24 new tests. Full suite: 289 tests (was 264), all green;
      `tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all clean (same one
      pre-existing, unrelated `eslint` finding, still untouched). Confirmed via the build's
      route table that `/api/tenants/[id]/modules` and
      `/api/tenants/[id]/modules/[moduleName]` both registered correctly.

## Phase 12, RBAC and nav polish — DONE 2026-08-07

- [x] Audited all six module pages plus `(dashboard)/assets` directly against decision 9
      (Viewer is read-only, not blocked) before changing anything, rather than assuming a
      fix was needed: grepped every page for `redirect(` conditioned on role and found
      none — `vm`, `vm/assets`, `edr`, `edr/endpoints`, `siem`, `siem/logs`, `cti`, `soar`,
      `dfir`, `dfir/[id]` all only use a role check to conditionally show/hide a create
      form or gate the Admin-only `GET /users` call, never to block the page itself. Then
      checked every row-action/table component's Viewer handling the same way:
      `AssignmentControl`, `StatusTransitionMenu`, `VulnerabilityStatusMenu` all
      `return null` for `UserRole.VIEWER`; `EndpointsTable`, `IocsTable`, `AssetsTable`,
      `LinksTable` all gate their own actions column on `currentUserRole !== "VIEWER"`;
      `PlaybooksTable` is the one correct exception (`currentUserRole === "ADMIN"` gates
      its actions column, matching SOAR's genuinely different, Admin-only RBAC from every
      other module, not a Viewer-specific gap). **Conclusion: nothing needed fixing** —
      every module was already built Viewer-correct from Phases 3-8, and `SidebarNav`
      already links every tenant-scoped role (including Viewer, via `isTenantScoped =
role !== SUPER_ADMIN`) to all six real module pages. This item is closed by
      confirmation, not by a code change.
- [x] Confirmed Next's routing precedence (checked before assuming, per the project's
      standing rule) before deleting anything: a static segment always resolves over a
      sibling dynamic one at the same level — this was already empirically proven back in
      Phase 3 via the build's route table (`vm`/`vm/assets` registering as their own routes
      alongside `[module]`, with `/dashboard/vm` never hitting the stub), and reconfirmed
      here by rebuilding after deletion: `/[module]` is gone from the route table entirely,
      every real module route (`/vm`, `/edr`, `/siem`, `/cti`, `/soar`, `/dfir`, `/assets`,
      etc.) is still present and unaffected. Deleted
      `(dashboard)/[module]/page.tsx` and `src/lib/nav.ts`'s `isModuleSlug`/`ModuleSlug`
      exports — grepped first and confirmed neither was referenced anywhere else (`MODULES`
      itself stays, `SidebarNav` still needs it for labels/links).
- [x] **One real snag hit deleting the route, not code-level:** `tsc --noEmit` immediately
      failed against `.next/{dev/,}types/validator.ts`, both referencing the now-deleted
      `[module]/page.js` — Next's generated route-type validator files, stale from a
      previous build, not regenerated automatically by a file deletion alone. `rm -rf .next`
      before re-running `tsc` cleared it; worth remembering as a general "deleted a route,
      `tsc` still complains" fix for future route removals in this project, not specific to
      this one.
- [x] Full suite re-verified after the deletion: 289 tests still passing (no test file ever
      covered the stub or `isModuleSlug`, confirmed by grep before deleting, so the count
      didn't change), `tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all
      clean (same one pre-existing, unrelated `eslint` finding, still untouched).

## Phase 13, final verification pass — DONE 2026-08-08

- [x] Walked the verified route inventory above route-by-route against the finished
      frontend (grepped every controller's `@Get`/`@Post`/`@Patch`/`@Delete`/`@Sse`
      decorators fresh, not carried over from memory, then cross-checked each one against
      `src/app/api/**` and its UI caller). Confirmed the backend has grown zero new routes
      since the inventory was last verified (2026-08-07) — everything documented there still
      matches exactly. Found and fixed two real, previously-undocumented drift spots in the
      inventory's own text (both corrected in place above, not just here): the **Tenants**
      entry still said `PATCH :id`/the whole `modules` subtree had "no frontend", true when
      written but stale since Phase 11; and the **Users** entry's blanket "all already
      wired" claim missed that `GET :id` genuinely has no Route Handler and no caller
      anywhere — not a gap, `UserRowActions`' edit dialog already has the full user object
      from the list page's one fetch, but the inventory should say so explicitly rather than
      imply full coverage it doesn't have. Every other route: real UI, or one of the plan's
      already-documented exceptions (decision 7's four `POST .../events` routes, EDR's
      missing manual-create, `GET /users/me` and `GET /tenants/:id` being called directly
      from Server Components rather than through a Route Handler).
- [x] **Real, consequential finding, not just a confirmation:** `__tests__/`, `__mocks__/`,
      and `docs/` — including this file's own sibling `docs/internship-report-frontend.md`
      — were all still `.gitignore`d, verified directly with `git ls-files`/`git
check-ignore` (zero tracked files, zero git history, for all three, this entire
      session). This had been flagged as a real gap since 2026-07-28 and repeated at every
      later mention, but two places in `docs/internship-report-frontend.md` had drifted
      into incorrectly claiming it was "closed" — corrected in place there too, not
      silently rewritten. Fixed here: removed the three lines from `.gitignore`. **Left
      unstaged and uncommitted** — committing is the user's call, this session only ever
      edits files, per the standing "commit only when asked" convention.
- [x] **A second, related finding surfaced only because of the first fix:** Prettier 3.x
      respects `.gitignore` by default, so every `npx prettier --check "__tests__/**"` run
      this entire session had been silently a no-op for test files — the reported "clean"
      results only ever meant `src/` was clean. Once `__tests__/` came off `.gitignore`,
      re-running the check surfaced 41 genuinely unformatted test files spanning nearly
      every phase. Reformatted all of them (`prettier --write`, two passes — the first
      pass's line-length cascades needed a second to fully settle) and reverified: full
      suite still 289/289 green, `tsc --noEmit` clean, `next build` clean, and
      `prettier --check` now down to exactly the same 9 pre-existing unformatted `src/`
      files this session has consistently left untouched (never 10 — `tenant-admins-table
.tsx` and `reset-admin-password-button.tsx` were always in that set; the two tenant
      files this session actually wrote, `rename-tenant-button.tsx` and
      `tenant-module-row-actions.tsx`, are properly formatted). **This claim itself was
      stale within a day, corrected by the twentieth pass above:** the reformatting scope
      described here only covered `__tests__/`, not the `docs/` directory this same phase
      also un-gitignored — `docs/superpowers/specs/2026-07-28-...-design.md` sat unformatted
      and uncounted until `/code-review` caught it. Left in place per this file's own
      convention rather than rewritten.
- [x] Directory structure diagram, Known gaps, and Functionality backlog were already kept
      current phase-by-phase per this file's own rule (not deferred to this pass) — this
      pass's own read-through still caught three more stale spots worth fixing rather than
      leaving for a future reader to trip over: the "Super Admin has no `/users/me`-
      equivalent" bullet's parenthetical had claimed tenant deletion had no UI long after
      `DeleteTenantButton` existed (stale since 2026-07-16, never caught by any pass in
      between); the "No row-level actions on the alerts table" bullet described a mock
      table that stopped existing in Phase 5; and the "`[module]/page.tsx` stub is still
      stale" cross-reference in the mock-data bullet needed updating now that Phase 12
      deleted the stub. All three struck through/corrected in place, matching this file's
      existing convention rather than silently deleted.
- [x] `docs/internship-report-frontend.md` gained §3.27 covering this phase, plus the two
      corrections described above threaded into §3.14/§3.15 where the original false claims
      lived, and §4's summary bumped to reflect every phase through Phase 13.

# Working with this repo

- Same conventions as the backend: don't guess at root causes, verify against
  `node_modules/next/dist/docs/` or the actual generated file before assuming an API
  behaves like an older/more familiar version.
- The person driving this project is doing it to learn — when working here, prefer
  explaining tradeoffs and pointing at the relevant doc over silently picking an approach,
  unless explicitly asked to just implement something.
