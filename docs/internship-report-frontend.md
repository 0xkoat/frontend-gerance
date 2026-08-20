# SecOPs Frontend — Development Log

**Project:** SecOPs — Multi-tenant SOC SaaS Platform (SIEM, SOAR, CTI, EDR, DFIR, VM)
**Component:** Frontend Client
**Author:** Youssef Kessentini
**Role:** Security Engineer (Frontend)
**Period covered:** Project inception → current (last updated 2026-08-08)

---

## 1. Project Context

SecOPs is a multi-tenant Security Operations Center (SOC) SaaS platform developed as part of an
internship. It integrates six security modules — SIEM, SOAR, CTI, EDR, DFIR, and VM — under a
single platform, each tenant (client organization) able to activate the modules relevant to them.
The backend (NestJS + PostgreSQL/Prisma) was built and security-reviewed first, covering
authentication, role-based access control, and tenant provisioning; see
`backend/docs/internship-report-backend.md`. This document covers the frontend, built entirely
in a single continuous session against that already-finished backend contract.

### 1.1 Starting point

`frontend/` was an empty directory — no `package.json`, nothing scaffolded — as of the start of
this work. Everything described below, from project scaffolding through a live end-to-end
smoke test against the real backend, was built in that time.

### 1.2 Architecture decisions

| Decision                                                     | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js App Router, `src/` layout                            | Matches the architecture spec; `src/` keeps application code separate from root-level config files, which matters once the codebase grows past a single dashboard page.                                                                                                                                                                                                                                                                        |
| httpOnly-cookie backend-for-frontend (BFF) auth              | At the time this was decided, the backend was stateless JWT with no refresh tokens; it gained refresh-token rotation 2026-08-05 (see §2, §3.15). The BFF shape held regardless — client-side JS still never holds either token, Next.js Route Handlers still proxy every authenticated backend call. Detailed in §2.                                                                                                                           |
| No signature verification on the frontend                    | The frontend doesn't hold `JWT_SECRET`, deliberately — sharing a signing secret between two independently deployable services to re-verify a token issued moments earlier over a trusted server call has no security benefit and adds a shared-secret liability. The backend verifies the signature on every proxied request; that is the real boundary.                                                                                       |
| Two-layer route protection (optimistic + real)               | `proxy.ts` (Next 16's renamed `middleware.ts`) does a cheap, decode-only redirect check on every request. Every protected page additionally calls `requireSession()` itself, since Next's own documentation explicitly warns that layout-level checks don't re-run on sibling client-side navigation. Both layers sit on top of the backend's own guards, which remain the actual authorization boundary regardless of what the frontend does. |
| shadcn/ui component primitives, hand-built charts            | The architecture spec calls for shadcn/ui + Recharts. Recharts was deliberately not installed — the dashboard's severity/attack-source visuals are simple enough to build directly with Tailwind, and pulling in a charting library for two static bar visualizations would be dependency weight without a corresponding need (no zoom/brush/multi-series interactivity anywhere yet).                                                         |
| Mock data for SIEM content, real data for auth/users/tenants | Only `auth`, `users`, and `tenants` exist on the backend. Every dashboard element backed by one of those three modules is wired to the real API; SIEM alert/KPI content is explicitly mocked and labeled as such in both the UI copy and code comments, so it's unambiguous which parts of the running app are real.                                                                                                                           |

### 1.3 Technology stack

- **Framework:** Next.js 16.2.10, App Router, Turbopack
- **Language:** TypeScript 5.9.3, React 19.2.4
- **Styling:** Tailwind CSS v4 (CSS-first `@theme` configuration, no `tailwind.config.ts`)
- **Components:** shadcn/ui, `base-nova` preset — built on `@base-ui/react`, not Radix UI
- **Validation:** `zod` v4, schemas hand-mirrored from the backend's `class-validator` DTOs
- **Forms:** no form library — shadcn's `field.tsx` markup primitives + manual `useState`/`zod.safeParse`, matching the pattern in Next's own bundled authentication guide (this shadcn version ships no `form.tsx`/react-hook-form integration)
- **Other:** `sonner` (toasts), `lucide-react` (icons) — both pulled in by `shadcn init`

---

## 2. Frontend Auth Architecture

**Updated 2026-08-07 (§3.15) — the description below reflects the post-migration design.**
Until 2026-08-05 the backend issued a stateless JWT with a 1-hour expiry and no refresh
tokens; it now issues a 15-minute access token plus a rotating, httpOnly `refresh_token`
cookie with reuse detection (see backend report §4.16). The frontend wraps that in a
backend-for-frontend layer instead of handling either token client-side:

1. **The browser never receives the raw JWT.** `POST /api/auth/login` (a Route Handler) calls
   the real backend, then stores the returned `access_token` in an **httpOnly**, `SameSite=Lax`
   cookie (`secops_token`) and relays the backend's rotated `refresh_token` cookie back to the
   browser (`src/lib/backend.ts`'s `applyRefreshCookie`) — the backend sets that cookie on its
   own response, which the browser never sees directly since the Route Handler calls the
   backend server-side. Every other authenticated mutation (`change-password`, `create user`,
   `create tenant`) goes through its own Route Handler that reads the `secops_token` cookie
   server-side and attaches it as an `Authorization` header before calling the backend
   (`src/lib/backend.ts`'s `backendFetchAuthed`).
2. **A 15-minute access token doesn't mean a 15-minute session anymore.** `backendFetchAuthed`
   retries once through `refreshAccessToken()` on a 401, using the browser's `refresh_token`
   cookie to mint a fresh access token (and a rotated `refresh_token`) transparently — a
   session now only actually ends when the refresh token itself is rejected (expired, or its
   family was killed by reuse detection), not when the 15-minute access token alone expires.
   `POST /api/auth/refresh` and an updated `POST /api/auth/logout` (which now actually calls
   the backend's `POST /auth/logout` before clearing local cookies, rather than doing nothing
   server-side) round out the migration — full detail in §3.15.
3. **A real constraint found while building the above, not anticipated in the original
   plan: the refresh-capable path can only run from a Route Handler.** `next/headers`'
   `cookies().set()` throws during Server Component rendering, and worse, the backend rotates
   (invalidates) the _old_ refresh token the instant it receives a refresh request regardless
   of whether the frontend can persist the new one — a Server Component that triggered a
   refresh it couldn't persist would leave the browser holding a dead refresh token, tripping
   the backend's reuse detection on the next real attempt. `backendFetchAuthed` (refresh
   -capable) is therefore Route-Handler-only; `backendFetchAuthedNoRefresh` (identical
   otherwise) is what the four Server Component pages that fetch data directly during render
   use instead. See §3.15 for how this was found and CLAUDE.md's "Frontend auth architecture"
   section for the full reasoning.
4. **Decode, never verify, on the frontend.** `src/lib/jwt.ts` decodes the JWT payload (and
   checks `exp`) but never checks the signature — the frontend has no `JWT_SECRET` by design (see
   §1.2). This decoded payload is used only for optimistic UI/redirect decisions, never as an
   authorization check for data access.
5. **Two independent, deliberately redundant protection layers**, both sitting on top of the
   backend's real guards:
   - `src/proxy.ts` — Next.js 16 renamed `middleware.ts` to `proxy.ts`; this was discovered by
     following the project's `AGENTS.md` instruction to check `node_modules/next/dist/docs/`
     before assuming API familiarity, rather than by trial and error. Runs on every request,
     decodes the cookie, and redirects unauthenticated visitors to `/login` and
     authenticated-but-`mustChangePassword` visitors to `/change-password`.
   - `requireSession()` (`src/lib/session.ts`) — called in every protected `page.tsx`
     individually, not just the shared dashboard layout, per Next's own authentication guide's
     explicit warning that layout-level checks don't re-run on sibling client-side navigation.
     Admin-only and Super-Admin-only pages additionally check `session.role` and redirect.
6. **Access-token cookie lifetime matches the access token's.**
   `SESSION_MAX_AGE_SECONDS = 900` (15 minutes, was `3600`/1 hour before the migration) — the
   refresh_token cookie described in point 2 is what actually extends the session past this
   window now, rather than the cookie simply expiring with nothing behind it.

---

## 3. Implementation Log (chronological)

### 3.1 Project scaffolding and structural decisions

- `create-next-app` was run with TypeScript, Tailwind, App Router, and an import alias, then the
  project was manually restructured into `src/` (scaffolding tools default to a root-level `app/`
  unless a `src/` layout is chosen at generation time) — `tsconfig.json`'s path alias and
  `components.json`'s CSS path were updated to match.
- `shadcn init` was run with the `base-nova` preset (matching the Geist font already wired in by
  `create-next-app`, avoiding a second font family). This surfaced two version-specific behaviors
  not obvious from general shadcn familiarity: the component library is built on `@base-ui/react`
  rather than Radix UI (different prop shapes — e.g. `Select`'s `onValueChange` is
  `(value: string | null, details) => void`, nullable, unlike Radix's), and there is no
  `form.tsx`/react-hook-form integration in this version, only the framework-agnostic `field.tsx`
  primitives (`Field`, `FieldLabel`, `FieldError`, etc.).
- Default Vercel/Next.js boilerplate (demo SVGs, the default landing page content) was removed.

### 3.2 Authentication flow

Built: `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/forgot-password`, and
`PATCH /api/users/me/password` as Route Handlers proxying the equivalent backend endpoints,
following the BFF pattern in §2. Corresponding pages:

- `(auth)/login` — email/password form, client-side `zod` validation mirroring the backend's
  `LoginDto`, redirects to `/change-password` or `/dashboard` based on the login response's
  `mustChangePassword` flag.
- `(auth)/forgot-password` — deliberately not framed as an email-reset-link flow: the backend's
  `POST /auth/forgot-password` only flags the account for the tenant Admin to notice
  (`passwordResetRequestedAt`) and always returns an identical generic message regardless of
  whether the email exists, so the frontend copy reflects that behavior rather than implying a
  capability the backend doesn't have.
- `(auth)/change-password` — serves both the forced flow (`mustChangePassword: true`, redirected
  here by `proxy.ts`) and voluntary password changes, with copy that adapts to which case applies.
  On success, the Route Handler stores the freshly-signed JWT the backend returns (the old token's
  `mustChangePassword` claim is immutable once issued, so the cookie has to be rotated, not just
  left in place, or the guard chain would keep blocking the now-changed account).

### 3.3 Role-based dashboard shell

- `(dashboard)/layout.tsx` — calls `requireSession()`, fetches the current user's profile from
  `GET /users/me` for tenant-scoped roles to populate the sidebar (name, role, email). Super
  Admin is a documented exception: `GET /users/me` throws `ForbiddenException` for accounts with
  no `tenantId` on the backend, so there is currently no equivalent "who am I" call for that role
  — the layout falls back to JWT claims only.
- `src/components/dashboard/sidebar-nav.tsx` — persistent left navigation matching the
  architecture spec's Figure 2 layout: Dashboard for all roles, a Users link for Admin, a Tenants
  link for Super Admin, and the six module links for tenant-scoped roles only (Super Admin isn't
  bound to a tenant, so per-module views don't apply to that role).
- `(dashboard)/[module]/page.tsx` — a single generic stub route (rather than six near-identical
  files) so the sidebar's module links resolve to a labeled placeholder instead of a 404, pending
  the actual SIEM/SOAR/CTI/EDR/DFIR/VM modules being built on the backend.

### 3.4 Security Overview dashboard

Role-conditional content on `(dashboard)/dashboard`:

- **Super Admin** sees a tenant overview backed by real `GET /tenants` data (see §3.6) — no
  alert/incident data exists at this scope on the backend, so this is a distinct view rather than
  the same dashboard with a tenant switcher.
- **Tenant-scoped roles** (Admin, Analyst, Viewer) see the Security Overview mockup (Figure 2):
  KPI cards, a severity breakdown, a top-attack-sources visualization, and a recent-alerts table
  — all explicitly mock data (`src/lib/mock-data.ts`), since the SIEM module doesn't exist on the
  backend yet. Both the UI copy and inline code comments say so, so nothing here is
  mistakable for a live feed.
- Chart color choices (severity status colors, the sequential single-hue attack-source bars)
  followed a structured design-system methodology (form → color-by-job → contrast/colorblind
  validation) rather than being picked visually, reusing a pre-validated status palette instead
  of hand-picking and separately re-validating new colors for a 4-state severity scale.

### 3.5 Admin user management

`(dashboard)/users` — Admin-only (redirects otherwise, in addition to the backend's own
`@Roles(UserRole.ADMIN)` guard), lists a tenant's users via `GET /api/users` and creates
subordinate users via `POST /api/users`, both real Route Handlers proxying the live backend. The
create form's role options are restricted client-side to `ADMIN | ANALYST | VIEWER`, matching the
backend's `CreateSubordinateUserDto` — never `SUPER_ADMIN`, which is seed-script-only.

This was built specifically instead of a public "signup" form: the backend has an explicit,
documented rule that no self-registration endpoint exists or ever will (backend report §2.1) —
every account is created by someone above it in the hierarchy. Building a public signup form
would have contradicted that rule outright, so the equivalent real capability (an Admin creating
a subordinate account) was built instead.

### 3.6 Super Admin tenant provisioning

`(dashboard)/tenants` — Super-Admin-only, wired to the backend's `POST /tenants` (creates a
`Tenant` row and its first `Admin` user atomically, per backend report §4.9) and `GET /tenants`.
This closed out the one remaining "signup-shaped" gap in the platform: a Super Admin can now
provision a brand-new tenant and its initial Admin account entirely through the UI, which was not
possible before this addition (only the seed script could create the very first tenant/Admin
pair). Tenant deletion (`DELETE /tenants/:id`, which exists on the backend) has no UI yet —
listed as deferred work in §4.

### 3.7 Security review and hardening (2026-07-16)

A dedicated `/security-review` pass (multi-agent: an initial vulnerability-identification pass,
followed by an independent verification pass against the skill's false-positive-filtering
checklist) was run against the full frontend diff, scoped to injection, XSS, and CSRF
specifically. Result:

- **No injection findings** — the frontend never queries a database directly; all persistence
  goes through the backend's own Prisma layer, out of scope for this review.
- **No XSS findings** — nothing in the codebase uses `dangerouslySetInnerHTML` or an equivalent
  unsafe API; React/JSX's default escaping was relied on throughout.
- **One CSRF finding, fixed:** `POST /api/auth/login` was the one Route Handler in the app
  reachable by a cross-site request with no cookie precondition (every other mutating route
  already requires the `secops_token` cookie to pre-exist, and `SameSite=Lax` keeps that cookie
  off cross-site requests entirely). Because `Request.json()` parses a body as JSON regardless of
  its declared `Content-Type`, a cross-site page could reach the login handler with
  `mode: "no-cors"` and `Content-Type: text/plain` (a CORS-simple type, so no preflight is
  triggered) carrying attacker-controlled credentials, and have the resulting session cookie
  planted in a victim's browser — a login-CSRF / session-fixation pattern. The independent
  verification pass corroborated every technical claim in the finding (confirmed via direct code
  reading, not assumed) and scored it 7/10 confidence — just under the skill's 8/10 reporting
  threshold, but reported anyway given it matched exactly what the review was asked to check for.
  **Fix:** the login Route Handler now rejects any request whose `Content-Type` isn't
  `application/json` before parsing the body, forcing a real cross-site attempt through a CORS
  preflight the route never answers with an `Access-Control-Allow-Origin` header.

### 3.8 Live end-to-end verification against the real backend (2026-07-16)

Everything above had only been verified via `tsc --noEmit`, `eslint`, `next build`, and
route-protection checks against a stopped backend, up to this point. A full live pass was then
run against a real, freshly migrated and seeded Postgres/NestJS instance:

- The CSRF fix confirmed live: the `text/plain` bypass attempt now returns `415`, a genuine
  `application/json` login still succeeds.
- Full provisioning chain exercised for real: Super Admin login → tenant + first-Admin creation
  (`Meridian Corp`) → that Admin's own login → subordinate Analyst creation → Admin-initiated
  password reset on that Analyst (`mustChangePassword` flips to `true` server-side, as designed)
  → the forced `/change-password` redirect firing correctly → the Analyst completing the change
  → the session cookie rotating to the new token → the account regaining dashboard access.
- Role gating confirmed both directions: a Super Admin session can reach `/tenants` (200) but is
  redirected off the Admin-only `/users` (307 → `/dashboard`).
- The dashboard layout's `GET /users/me` integration confirmed server-rendering the real
  authenticated user's name and role, not placeholder content.
- No errors in either server's logs across the full test sequence.

### 3.9 Framework/tooling issues found and fixed

None of these were introduced by feature work; they surfaced because this Next.js/React/zod
release set has real behavioral differences from more commonly documented older versions, and
each was only caught by actually running `tsc`/`eslint`/`next build` rather than assuming prior
familiarity still applied.

| #   | Issue                                                                                                | Root cause                                                                                                                                                                      | Fix                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `middleware.ts`-based route protection would have silently done nothing                              | Next.js 16 deprecated and renamed the file convention to `proxy.ts` (exported function `proxy`, not `middleware`)                                                               | Followed the project's own `AGENTS.md` instruction to check `node_modules/next/dist/docs/` before writing App-Router-specific code; used `proxy.ts` from the start.                                |
| 2   | `Select`'s `onValueChange={setState}` failed to typecheck                                            | This shadcn preset is built on `@base-ui/react`, not Radix UI — Base UI's `onValueChange` signature is `(value: string                                                          | null, details) => void`(nullable), incompatible with a plain`Dispatch<SetStateAction<string>>`                                                                                                     | Wrapped the setter: `onValueChange={(value) => value && setRole(value)}`. |
| 3   | `React.FormEvent<HTMLFormElement>` flagged by the TypeScript language service as deprecated          | React 19.2's bundled types mark `FormEvent` `@deprecated` (`"FormEvent doesn't actually exist"`) in favor of `SubmitEvent`, `ChangeEvent`, or `InputEvent` depending on context | Switched all four form components' submit handlers to `SubmitEvent<HTMLFormElement>`.                                                                                                              |
| 4   | `z.string().email(...)` flagged as deprecated by the editor/linter                                   | zod v4 moved top-level string-format validators (`email`, `url`, etc.) out of the chained `.string()` API                                                                       | Replaced with `z.email(...)` throughout `src/lib/validations/`.                                                                                                                                    |
| 5   | Backend and frontend dev servers would collide on port 3000                                          | The backend defaults to port 3000 when `PORT` is unset (`backend/src/main.ts`), the same as Next's own dev default                                                              | Pinned the frontend's `dev`/`start` scripts to port 3001 (`next dev -p 3001`) rather than changing the backend's established default.                                                              |
| 6   | `npm audit` reports a moderate PostCSS advisory                                                      | The vulnerable version is a transitive dependency bundled _inside_ `next` itself                                                                                                | `npm audit fix --force` would downgrade Next.js to a `9.x` canary release to resolve it — rejected as strictly worse than the advisory; left as an accepted, low-relevance (build-time only) risk. |
| 7   | Two NestJS processes briefly collided on port 3000 (`EADDRINUSE`) during the live smoke-test spin-up | `nest start --watch`'s webpack rebuild spawned a second instance before the first had fully released the port                                                                   | Not a code defect — one instance survived and served correctly; noted here only because it produced log noise during verification.                                                                 |

**Version discrepancy, unresolved:** the architecture spec calls for TypeScript 6.0.3;
`create-next-app`'s generated `"typescript": "^5"` dependency resolves to 5.9.3. Left as an open
question (verify against `npm view typescript versions` whether 6.x exists/is stable) rather than
guessed at, per this project's standing rule to verify before acting on unclear version claims.

### 3.10 Second pass: tenant deletion, marketing login screen, favicon, first test suite (2026-07-16)

A follow-up pass closed out four items from the deferred list above.

- **Tenant deletion UI.** `DELETE /api/tenants/[id]/route.ts` (Super-Admin-gated, same
  fast-fail-then-backend-guard pattern as every other Route Handler) plus a
  `DeleteTenantButton` using shadcn's `alert-dialog` for confirmation — deleting a tenant
  cascades to every user and module-config row it owns on the backend, with no undo, so a
  bare button without confirmation would have been a real footgun. Verified live: created a
  throwaway tenant, deleted it through the actual Route Handler, confirmed it dropped out of
  `GET /tenants`.
- **Figure 1 split-panel login screen.** Moved `login` out of the `(auth)` route group to a
  sibling `src/app/login/` — Next.js route groups apply their layout to every child with no
  per-route opt-out, and `(auth)/layout.tsx`'s centered-card layout was structurally
  incompatible with the mockup's full-bleed two-panel design. The move doesn't change the
  URL (route groups never appear in it); it only detaches this one route from that shared
  layout. Left out of the rebuild: the mockup's "Sign in with SSO" button — no backend SSO
  capability exists, and adding the button would have implied a capability that isn't real,
  the same reasoning already applied to the forgot-password copy in §3.2.
- **Generated brand favicon.** `src/app/icon.tsx`, using Next's `next/og` `ImageResponse`
  code-generation convention rather than a static image file (no designed brand asset
  exists yet) — renders the same "S" mark and orange accent now used in the sidebar, so the
  browser tab and the in-app logo match instead of being two different placeholders.
  **A real bug surfaced by this change, caught before it shipped:** `proxy.ts`'s matcher
  excluded `api`, `_next/static`, `_next/image`, and `favicon.ico`, but not the new
  `/icon` route Next generates for `icon.tsx` — so an unauthenticated visitor's favicon
  request was being redirected to `/login`, breaking the tab icon on every public page,
  including `/login` itself. Fixed by adding `icon` to the matcher's negative lookahead;
  verified live (`GET /icon` returns `200 image/png` for an unauthenticated request).
- **First automated test suite.** Jest + React Testing Library, following Next's own bundled
  testing guide (`node_modules/next/dist/docs/01-app/02-guides/testing/jest.md`) rather than
  assumed prior familiarity — confirmed `next/jest` is still the correct integration for this
  version. Two non-obvious setup issues resolved along the way, both are real footguns for
  this specific stack and worth carrying forward:
  - The `"server-only"` package unconditionally throws on import (Next's build system
    statically strips it from the server compilation graph so it never executes there in
    production; Jest has no equivalent stripping). Fixed via the `moduleNameMapper` mapping
    documented in Next's own Jest guide (`'server-only': '<rootDir>/__mocks__/empty.js'`).
  - `next/headers`'s `cookies()` is request-scoped (backed by an `AsyncLocalStorage` Next
    sets up per-request) and throws outside a real request context, which Jest doesn't
    provide. Rather than force a mock, test scope was kept to the code paths that don't
    reach it — e.g. the login route's CSRF regression test only exercises the Content-Type
    guard, which returns before any cookie code runs, so it tests the actual production
    handler rather than a reimplementation of it.
  - Separately, Next's env-loading skips `.env.local` when `NODE_ENV=test` (by design, so
    dev secrets don't leak into test runs) — `src/lib/backend.ts` requires `BACKEND_URL` at
    import time, so `jest.setup.ts` sets a fixed placeholder value directly rather than
    relying on `.env.local` being loaded.

  Coverage: `proxy.ts`'s full redirect matrix (unauthenticated → `/login`, authenticated →
  protected routes, authenticated hitting `/login` → `/dashboard`, `mustChangePassword` →
  `/change-password`, expired-token handling), a regression test for the CSRF fix in §3.7,
  and `LoginForm`'s validation/success/`mustChangePassword`/error paths. 14 tests, 3 suites,
  all passing. Still far short of the backend's 109 unit + 60 e2e tests — see
  `frontend/CLAUDE.md`'s "Testing" backlog section for exactly what's not covered yet
  (other forms, Route Handler success paths, no e2e/Playwright layer).

### 3.11 Third pass: full Admin user-management actions, remaining form test coverage (2026-07-16)

Closed out the two largest remaining items from the deferred list: Admin actions beyond
create/list, and test coverage for the other four forms plus the delete-tenant flow.

- **Admin user actions.** `UserRowActions` (a dropdown menu + four dialogs on
  `(dashboard)/users`'s table) now covers edit profile, change role, reset password, and
  delete — wired to `PATCH/DELETE /api/users/[id]`, `PATCH /api/users/[id]/role`, and
  `POST /api/users/[id]/reset-password`, all new Route Handlers following the same
  fast-fail-then-backend-guard pattern as every other route in the app. The backend already
  rejects every self-targeting variant of these actions (self-role-change, self-delete,
  Admin-reset-on-self — see backend report §2.1's account-takeover reasoning), so the row for
  the caller's own account renders no action menu at all rather than a menu full of items
  that would just 403. Verified live end-to-end against the real backend, including both
  self-target rejections passing through the backend's actual error messages
  ("You cannot change your own role", "You cannot delete your own account") rather than a
  generic frontend message.
- **Extracted the repeated Route-Handler role-check.** By this point the fast-fail
  Admin/Super-Admin check had been copy-pasted into five Route Handler files. Consolidated
  into `src/lib/api-guards.ts`'s `requireRole()` (with `requireAdmin`/`requireSuperAdmin`
  convenience wrappers) rather than pasting it a sixth, seventh, and eighth time for the new
  routes.
- **A real bug found while writing the new tests, not before.** Every form that shows
  inline per-field validation errors used the same loop —
  `for (const issue of error.issues) errors[issue.path[0]] = issue.message` — which keeps
  whichever issue is _last_ in the array for a given field, not the first. Zod collects every
  failing check per field rather than stopping at the first (a 5-character all-lowercase
  password fails the length, uppercase, number, _and_ symbol checks simultaneously), so this
  meant the UI was showing the least fundamental problem ("needs a symbol") instead of the
  most immediately actionable one ("too short"). Surfaced by a test asserting the expected
  message for a weak password and getting a different, technically-also-true one instead —
  exactly the kind of gap that passes as "it validates, technically" without a test forcing
  the specific message to be checked. Fixed by extracting `src/lib/zod-errors.ts`'s
  `fieldErrorsFromZod()` (first-issue-per-field, via `??=`) and applying it at all five call
  sites — `login-form.tsx`, `change-password-form.tsx`, `create-user-form.tsx`,
  `create-tenant-form.tsx`, and `user-row-actions.tsx`'s edit dialog.
- **Test suite grew from 3 files/14 tests to 8 files/32 tests**, adding coverage for
  `ChangePasswordForm` (including the client-side "new password must differ from current"
  check, and the `forced` prop's label swap), `ForgotPasswordForm` (including that the
  generic anti-enumeration message shows identically regardless of whether the backend
  claims the account exists), `CreateUserForm`, `CreateTenantForm`, and
  `DeleteTenantButton`'s full confirm/cancel/success/error dialog flow.
- **A real testing-infrastructure bug, not a product bug.** Running the full suite in
  parallel Jest workers under WSL2 produced two failures that vanished when the same file
  ran in isolation (2s solo vs. exceeding the 5s default timeout under load) — and, more
  concerning, one test's `userEvent.type` calls appeared to leak keystrokes into the _next_
  test's freshly rendered inputs (observed as scrambled/interleaved text, e.g. `"Sar"` and
  `"0M0e0r9idia"` where `"Sara Khelifi"` and `"Meridian Corp"` were expected) — consistent
  with a test being killed mid-typing under CPU contention while its async keystroke-dispatch
  chain kept running in the background. Root-caused by isolating the failing file rather than
  guessing, then fixed by raising Jest's `testTimeout` to 15s in `jest.config.ts`, giving
  real headroom over the observed ~2s solo runtime instead of just retrying until it happened
  to pass.

### 3.12 Fourth pass: project-hygiene audit (2026-07-16)

A step back from feature work to answer "what's still not configured?" — an explicit audit
against what the backend had already established as this project's standard (CI, Prettier,
security headers via `helmet()`), verified with actual evidence (checked real response
headers via `curl`, diffed actual files against the backend's) rather than assumed from
general Next.js project familiarity. Five items were identified; four were fixed this pass,
with CI explicitly deferred at the user's direction rather than skipped silently.

- **Security response headers.** `next.config.ts` gained a `headers()` config: a static
  (non-nonce) Content-Security-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options:
nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`, and — in
  production only — `Strict-Transport-Security` mirroring the backend's `helmet()` HSTS
  config exactly (same 2-year `max-age`). Also `poweredByHeader: false`, removing the
  `X-Powered-By: Next.js` header confirmed (via `curl -I`) to be sent by default. A
  nonce-based CSP was considered and rejected: it would force every page into dynamic
  rendering app-wide for a benefit (blocking specific inline scripts by nonce) this app
  doesn't need, since a full grep of `src/` turned up zero external script/style/font
  references and zero `dangerouslySetInnerHTML` usage — 'self' plus 'unsafe-inline' already
  captures the real threat model here. Verified live, not just written and assumed: booted
  the dev server, confirmed all six headers present on both a page route and the generated
  `/icon` route, then ran the full login → dashboard flow end-to-end again to confirm CSP's
  `connect-src 'self'` didn't silently break the app's own `fetch()` calls (it doesn't — the
  BFF architecture from §2 means every client-side fetch already targets same-origin `/api/*`
  paths, which happens to align perfectly with a strict `connect-src`).
- **Custom `not-found.tsx` / `error.tsx` / `global-error.tsx` / `loading.tsx`.** None of
  Next's error/loading file conventions existed before this pass — an unhandled error or a
  typo'd URL showed Next's generic default screen, off-theme and unbranded. Checking
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` before
  writing `error.tsx` caught another real version-specific change: this Next release renamed
  the error boundary's recovery callback from the widely-documented `reset` prop to
  `unstable_retry` (the doc explicitly recommends the new one; `reset` still exists but is
  now the exception case). Writing `error.tsx` from memory/training data would have used the
  wrong prop name silently — TypeScript would have caught the type mismatch, but only at
  build time, not as a design decision made with actual knowledge of the change.
  **A real bug found and fixed within this same sub-task**: the first version of
  `not-found.tsx` called `getSession()` to choose between a "back to dashboard" and "back to
  sign in" link label. Next's build output (the route table's `○` static vs `ƒ` dynamic
  markers) showed this had silently flipped `/login`, `/forgot-password`, and `/` from static
  to dynamic rendering across the _entire app_ — because the root `not-found.tsx` is a
  potential fallback for any route, Next has to treat paths that could hit it as dynamic once
  it depends on a per-request API like `cookies()`. Caught by reading the build output
  carefully rather than just checking it compiled, not by any test (nothing in the test suite
  asserts static-vs-dynamic rendering). Fixed by linking to `/` instead and letting the
  already-existing redirect logic (`src/app/page.tsx` + `src/proxy.ts`) resolve the correct
  destination — same user-facing behavior, zero rendering-mode side effects. Rebuilt and
  confirmed all three routes returned to static (`○`) in the route table before calling it
  done.
- **Prettier.** `.prettierrc` matches the backend's `.prettierrc` on every setting
  (`semi`, `tabWidth: 2`, `printWidth: 80`, `trailingComma: "all"`) except one deliberate
  divergence: `singleQuote: false`, not the backend's `true`. The backend is quote-style-agnostic
  Node/TS; this codebase is 100% double-quoted already (the idiomatic convention for
  JSX-heavy React code, and what `create-next-app`/`eslint-config-next` assume) — blindly
  copying `singleQuote: true` would have rewritten every JSX attribute in the app for no
  benefit beyond superficial cross-repo consistency. `npm run format`/`format:check` added;
  running `--write` once reformatted 80 files (nothing had ever been auto-formatted before),
  confirmed behavior-neutral by re-running `tsc`, `eslint`, and the full test suite
  afterward — all still green.
- **Node version pinning.** `.nvmrc` (`22`) and `package.json`'s `"engines": { "node":
">=22" }`, matching both what's actually installed here (`node --version` → `v22.23.0`) and
  the backend's own CI (`actions/setup-node@v4` with `node-version: 22`). Also bumped
  `@types/node` from `^20` to `^22` in the same pass, since a Node-22-pinned project with
  Node-20-shaped types is its own small inconsistency worth closing while touching this area.
- **CI — explicitly not done.** The user scoped CI out of this pass directly (asked for items
  1/3/4/5 of a five-item list, CI was item 2). Recorded in `frontend/CLAUDE.md`'s backlog as
  deferred-on-purpose, not forgotten, since the next obvious step (the frontend now has both
  a real test suite and a Prettier check with nothing running either automatically) is
  otherwise easy to lose track of.

### 3.13 Fifth pass: a codebase-reading session, three fixes, then a linked feature set (2026-07-23)

Started as a walkthrough of the codebase for someone new to Next.js, followed by an honest
audit of what was incomplete or untested in the auth/user-management area. That audit
surfaced three concrete gaps, fixed one at a time before any new feature work began, then two
follow-up requests turned into a small linked feature set spanning both repos.

**Fixes, in order:**

1. **`POST /api/auth/forgot-password` had the same login-CSRF exposure `login` was fixed for
   in §3.7, but never got the fix itself.** Both routes have no pre-existing-cookie
   precondition (every other mutating route does, which is what makes `SameSite=Lax` alone
   sufficient for them), so a cross-site page could reach either one via a CORS-simple
   `Content-Type: text/plain` request. Lower blast radius than login (only flags
   `passwordResetRequestedAt`, doesn't plant a session) but still a real gap — closed with the
   identical Content-Type guard, regression-tested the same way (`forgot-password-route.test.ts`,
   mirroring `login-route.test.ts`).
2. **`UserRowActions`' four dialogs (edit/role/reset/delete) had zero tests**, unlike every
   other form in the app — flagged as a backlog item since §3.11 but never closed. Writing them
   surfaced one real Testing Library timing issue worth remembering: `base-ui`'s `Menu` popup
   renders into a portal _after_ the trigger click resolves, so querying menu items
   synchronously right after `userEvent.click()` intermittently found nothing — fixed by
   awaiting `screen.findByRole("menu")` once per test before querying items with `getByRole`,
   rather than sprinkling `findByRole` calls throughout.
3. **Every Route Handler under `/api/users/**` and `/api/tenants/**` had zero tests** — the
   backlog's own stated reason was that `next/headers`' `cookies()` is request-scoped and
   throws outside a real request context. Resolved with `jest.mock("next/headers", () => ({
cookies: jest.fn() }))` per test file plus a `fakeToken()` helper (moved into `test-utils.ts`
   from its original home in `proxy.test.ts`) building a syntactically valid but unsigned JWT —
   safe to use in tests because `src/lib/jwt.ts` never verifies signatures either, only decodes
   (see its own doc comment). 30 new tests across `users-routes.test.ts` and
   `tenants-routes.test.ts`.

**Then, on top of the fixes, a small feature set:**

- **`GET /users` gained real pagination** (`page`/`pageSize` query params, `{ users, total,
page, pageSize }` response, Previous/Next controls on `(dashboard)/users`) — a scale gap
  found during the same audit (no `skip`/`take` anywhere, the whole tenant loaded into one
  table). This was a genuine breaking change to the endpoint's response shape, which is why it
  needed matching updates on both sides of the repo boundary, not just an additive backend
  change.
- **Admins now see when a tenant user has a pending password-reset request.** The backend
  already tracked this (`passwordResetRequestedAt`, set by `forgot-password`, already returned
  by `GET /users`) — the frontend's `TenantUser` type simply never included the field, and
  `UsersTable` never rendered it. Added a warning-colored badge + amber row tint, applied to
  _any_ tenant user with a pending request, including a co-Admin — which turned out to matter
  for the next item.
- **Super Admins get a real tenant detail page** (`(dashboard)/tenants/[id]`, closing the
  `GET /tenants/:id`-is-unused gap tracked since §3.6), listing that tenant's Admins with the
  same badge/tint, backed by a backend change (`TenantsService.findById` now includes the
  tenant's `ADMIN`-role users, hash stripped, under an `admins` key).
- **A new backend recovery path: a Super Admin can reset an Admin's password, but only when
  that Admin has no co-Admin in their tenant.** The reasoning, given directly rather than
  inferred: within a tenant with two-or-more Admins, a co-Admin can already reset another
  Admin's password today (only self-reset is blocked) — and, since the previous bullet's badge
  renders for _any_ user with a pending request, a co-Admin already sees it. The Super Admin
  path only earns its keep as a fallback for a tenant with exactly one, locked-out Admin.
  Implemented as `UsersService.resetSoleAdminPassword` on the backend (counts the target's
  tenant Admins, rejects with `ConflictException` above one), reusing the existing
  `POST /users/:id/reset-password` endpoint with `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)`
  rather than a new route. The frontend's own guard (`src/lib/api-guards.ts`) needed the same
  relaxation — `requireRole` was generalized from a single role to a variadic
  `requireRole(...roles)`, with `requireAdminOrSuperAdmin()` added alongside the existing
  `requireAdmin`/`requireSuperAdmin`.

**A real regression caught only because it was checked, not assumed:** the pagination and
`findById` changes silently broke two backend e2e tests (`test/users.e2e-spec.ts`'s `GET
/users` test still asserted the old array shape; `test/tenants.e2e-spec.ts`'s `GET
/tenants/:id` and `DELETE /tenants/:id` tests mocked a Prisma response with no `users` field,
which the new `findById` crashes on). Both backend e2e spec files mock `PrismaService`
entirely rather than needing a live database, so — contrary to an initial assumption that e2e
verification would be blocked by this session's sandbox having no Postgres available — they
were actually runnable, and running them is what surfaced the breakage. Fixed by updating both
mocks to the new response shapes; see `backend/docs/internship-report-backend.md` §4.13 for
the backend-side detail. What genuinely could not be verified in this sandbox: an actual
browser click-through of the new UI (`/tenants/[id]`'s reset-password dialog specifically) —
no Docker/Postgres meant no way to run the real Next.js dev server against a real backend, so
that verification is still owed at a machine that has both.

Test suite: 8 files/32 tests → 17 files/94 tests on the frontend. `frontend/CLAUDE.md` and
`backend/CLAUDE.md` were both updated in the same pass to keep their backlogs and hard-rules
lists in sync with what actually landed, per each file's own "don't let it drift from reality"
instruction.

### 3.14 Sixth pass: password-change enforcement + a request flow to replace self-service (2026-07-28)

Started from a reported symptom — new users weren't being forced through the first-login
password change — that turned out to be a real backend bug, not a frontend gap.
`UsersService.createUser` and `TenantsService.createTenantWithAdmin` never set
`mustChangePassword: true` on the accounts they created, relying on the Prisma column
default instead; every new account (first Admin, co-Admin, Analyst, Viewer) skipped the
forced change entirely. Fixed at the source on the backend.

While tracing that bug, a second gap turned up in this document's own §2: `requireSession()`
didn't check `mustChangePassword` even though `proxy.ts` did, so the "two independent,
deliberately redundant" layers described there weren't actually redundant for this one
check — closed with an `{ allowMustChangePassword: true }` param so `/change-password`
itself can stay reachable while every other protected page still gets the redirect.

**Then a deliberate feature removal, not an addition:** voluntary self-service password
change was removed for every role, Admins included, once past the mandatory first-time
change. `(auth)/change-password` now only shows the real change form
(`ChangePasswordForm`) while `mustChangePassword` is true; otherwise it shows
`RequestPasswordChangeForm`, which doesn't touch the password at all — it flags the account
(`POST /api/users/me/request-password-change`) for a single designated recipient per tenant
(the first-created Admin, or a Super Admin if that Admin is the one requesting) to notice,
surfaced via a new red-dot indicator on the sidebar's Users/Tenants nav link
(`GET /api/users/me/pending-password-requests`, polled by `(dashboard)/layout.tsx`). Full
design and verification log kept separately:
`docs/superpowers/specs/2026-07-28-password-change-request-flow-design.md`.

Test suite: 17 files/94 tests → 18 files/97 tests. Found, but not fixed as part of this
pass since it wasn't part of the request: `__tests__/` is `.gitignore`d in this repo, so all
97 tests existed locally but were untracked — CI or a fresh clone would see zero test files.
Flagged in `frontend/CLAUDE.md`'s backlog rather than lost; actually closed in Phase 13
(§3.27) — §3.15 below once claimed this too, incorrectly, see its own correction note.

### 3.15 Seventh pass: Phase 1 of the backend-to-frontend adaptation plan — auth migration (2026-08-07)

By 2026-08-06 the backend had grown far past what this document and `frontend/CLAUDE.md`
described: refresh-token rotation, account lockout, and all six security modules plus an
asset aggregator and an SSE stream had landed, none of it reflected on the frontend side.
`frontend/CLAUDE.md` gained a full phased adaptation plan to close that gap (13 phases,
verified route inventory, explicit design decisions with rationale) — this pass executed
Phase 1, the auth migration, since every later phase's Route Handlers depend on it.

**Verification before implementation, not after:** before writing any code, a dedicated
read-only pass checked every claim in `frontend/CLAUDE.md`'s route inventory, decisions, and
DTO/enum shapes against the actual backend source (every controller, DTO, and
`schema.prisma`). Everything matched except one real bug: `backend/src/users/module.ts` had
its own separate `JwtModule` registration — used by `UsersController.changeMyPassword` to
re-sign a fresh access token right after the mandatory first-login password change — still
hardcoded to the pre-migration `expiresIn: '1h'`, four times longer than every other access
token in the system. Fixed to `15m` (approved before starting, since it's a backend change
made from the frontend session).

**What was built:** `SESSION_MAX_AGE_SECONDS` dropped from 1h to 15m; new
`POST /api/auth/refresh` Route Handler backed by a shared `refreshAccessToken()` in
`src/lib/backend.ts` (also used by `backendFetchAuthed`'s retry path, rather than the route
re-implementing the logic or self-calling over HTTP); `login`/`logout` now relay/consume the
backend's `refresh_token` cookie; `backendFetchAuthed` retries once through a lazy refresh on
a 401, with an internal-only retry flag guarding against a second consecutive 401 triggering
a second refresh attempt.

**A real design gap found mid-implementation, not in the original plan:** `next/headers`'
`cookies().set()` throws during Server Component rendering — and the danger isn't just the
throw, since the backend rotates (invalidates) the _old_ refresh token the instant it
receives a refresh request regardless of whether the frontend can persist the new one
afterward. Four pages read backend data directly as Server Components
(`(dashboard)/dashboard`, its `layout.tsx`, `tenants[/[id]]`, `users`) and called the
refresh-capable `backendFetchAuthed` directly — a pre-existing deviation from this file's own
claim that Route Handlers were the only allowed caller, harmless until refresh support
existed to make it dangerous. Split into `backendFetchAuthed` (Route Handlers) and a new
`backendFetchAuthedNoRefresh` (Server Components, identical otherwise), moved the four call
sites, and corrected the forward-looking assumption in `CLAUDE.md`'s adaptation plan that
every future module page's server component could safely call the refresh-capable version.

**Correction (2026-08-08, Phase 13):** this section originally claimed `__tests__/` was "no
longer `.gitignore`d" as of this pass. That was wrong, and contradicted `frontend/CLAUDE.md`'s
own "Recently completed" entry for this exact same pass, which correctly said it was found
but _not_ fixed. Direct `git ls-files`/`git check-ignore` verification during Phase 13's
final pass confirmed `__tests__/` (along with `__mocks__/` and `docs/` itself — this file
included) had zero tracked files and zero git history the entire time, from this pass all
the way through Phase 12. Actually fixed in Phase 13, see §3.27 below — left here,
corrected rather than silently rewritten, so the drift is visible.

Test suite: 18 files/97 tests → 19 files/110 tests (new `auth-token-refresh.test.ts`, 15
tests covering `refreshAccessToken()`, `backendFetchAuthed`'s retry-once behavior, and the
login/refresh/logout Route Handlers' cookie relay). `tsc --noEmit`, `eslint`, and `next build`
all verified clean, both repos.

### 3.16 Eighth pass: Phase 2 of the adaptation plan — shared foundation for the six module pages (2026-08-07)

Same session, continuing straight into Phase 2: the scaffolding every one of the six module
pages (Phases 3-8) needs before any of them can be built — types, a query-filter builder, a
Route Handler factory, and the two row-action components every module's list page will
reuse instead of rebuilding assign/status controls six times.

**Built:** `src/types/security.ts` plus one file per module
(`vm.ts`/`edr.ts`/`siem.ts`/`cti.ts`/`soar.ts`/`dfir.ts`/`assets.ts`) — enums, record types,
and per-module `*_TRANSITIONABLE_STATUSES` constants, hand-mirrored against a full read of
`backend/prisma/schema.prisma` (verified along the way: none of the six modules' `query()`
methods `include` their relations, so every record type is a flat shape with foreign-key ids
only). `src/lib/severity.ts` reworked to the real uppercase `Severity` enum — a breaking
change to its exported maps' keys, not just an addition, so `src/lib/mock-data.ts` was
uppercased to match rather than left on two casings side by side (its data is still fake
either way, pending §Phase 9's dashboard rework). `src/lib/query-filters.ts`
(`buildQueryParams`/`hasNextPage`), a `NextOnlyPagination` component, and
`src/lib/proxy-route.ts`'s `proxyToBackend()` — the shared Route Handler factory the
adaptation plan calls for instead of ~40 hand-written near-duplicates.

**Proving the helper before trusting it, per the plan's own instruction:** `proxyToBackend()`
was built against one real route first (`src/app/api/vm/assets/route.ts`, `GET`/`POST`) so a
shape mistake in the helper would surface once, not 35 times. It did: an untyped `<Select>`
with no `value`/`defaultValue` prop couldn't infer its generic parameter, failing `tsc` until
given an explicit `<Select<string>>` — caught immediately by building the real route as part
of this pass rather than treating the helper as finished on paper.

**`AssignmentControl` and `StatusTransitionMenu`** round out the shared foundation: Admin
gets a plain (not searchable — no combobox/cmdk-equivalent primitive exists in this shadcn
preset, flagged as a simplification rather than quietly built as if it were real search)
`<Select>` of tenant Analysts/Admins passed down from the list page's own `GET /users` call;
Analyst gets a single "Assign to me" button matching the backend's own assignment rule
exactly; Viewer gets neither. `StatusTransitionMenu` covers SIEM/EDR/DFIR (VM and SOAR
don't share the same shape — documented in `src/types/vm.ts`/`soar.ts` why each is
excluded rather than forced through the same component).

Test suite: 19 files/110 tests → 24 files/143 tests. `tsc --noEmit`, `eslint`,
`prettier --check`, and `next build` all verified clean.

### 3.17 Ninth pass: Phase 3 of the adaptation plan — the VM module, the first real module page (2026-08-07)

Same session, straight into the first of six module phases: `(dashboard)/vm` (vulnerabilities
list — severity, description, CVE, resolved asset, status, assignee — with severity/status
filters and an "assigned to me" checkbox, `NextOnlyPagination`) and
`(dashboard)/vm/assets` (asset list, create, edit, delete). Five new Route Handlers on top of
Phase 2's `vm/assets` `GET`/`POST`: `vm/assets/[id]` (`PATCH`/`DELETE`),
`vm/vulnerabilities` (`GET`), `vm/vulnerabilities/[id]/status` (`PATCH`),
`vm/vulnerabilities/[id]/assign` (`POST`/`DELETE`) — all thin wrappers around Phase 2's
`proxyToBackend()`, which is exactly the payoff that helper was built for.

**One deliberate deviation from Phase 2's shared components:** VM's `PATCH
vulnerabilities/:id/status` accepts the full `VmVulnerabilitiesStatus` enum, not a restricted
transition subset the way SIEM/EDR/DFIR's status routes do — confirmed while building Phase
2, acted on here. Built a VM-specific `VulnerabilityStatusMenu` instead of forcing this
through the shared `StatusTransitionMenu`, which offers every status except the current one
rather than a fixed target list.

**A real constraint found while wiring up `AssignmentControl` for the first time against
real data, not anticipated in the plan:** `GET /users` — needed both to resolve
`assignedToUserId` to a display name and to populate the Admin picker — is
`@Roles(UserRole.ADMIN)`-gated on the backend. An Analyst or Viewer session calling it would
just 403. The VM page only fetches it when `session.role === ADMIN`; an Analyst still gets a
working "Assign to me" button (which needs no list at all), and a Viewer sees no assign
control, but neither role can resolve an assignee's name to anything beyond
`AssignmentControl`'s built-in "Assigned" fallback. Documented in the page's own code comment
rather than either silently sending a request guaranteed to fail or silently building a
picker that only half-works. This same constraint applies to every one of the other five
modules' list pages, not just VM's — worth remembering rather than rediscovering five times.

Also verified, not just assumed: the build's route table confirms the new static `vm/` and
`vm/assets/` folders take precedence over the dynamic `[module]/` stub for those two paths
specifically, exactly as Next's own static-over-dynamic routing rules say they should — the
stub itself stays in place, still covering the other five modules, until Phase 12 removes it
once all six are real.

Test suite: 24 files/143 tests → 30 files/164 tests (`vm-routes.test.ts`,
`create-asset-form.test.tsx`, `asset-row-actions.test.tsx`,
`vulnerability-status-menu.test.tsx`). `tsc --noEmit`, `eslint`, `prettier --check`, and
`next build` all verified clean.

### 3.18 Tenth pass: Phase 4 of the adaptation plan — the EDR module (2026-08-07)

Same session, same pattern as §3.17, second of six module phases:
`(dashboard)/edr` (detections list) and `(dashboard)/edr/endpoints` (endpoint list, edit,
delete). Five new Route Handlers, all thin `proxyToBackend()` wrappers the same way VM's
were.

**Two real differences from VM worth recording, not two more instances of "copy VM and
rename":**

- **EDR's filterable query fields are narrower than VM's.** `EdrQueryDto` extends the shared
  `BaseQueryDto` with only `endpointId`, no `status` — unlike `VmQueryDto`. The detections
  page's filter bar only offers severity and "assigned to me", matching what the backend
  actually accepts, rather than adding a status `<select>` that would silently do nothing
  server-side.
- **EDR's detection status route genuinely is a restricted transition set**
  (`UpdateEdrDetectionStatusDto`'s `@IsIn([ESCALATED, RESOLVED])`), the exact shape Phase 2's
  shared `StatusTransitionMenu` was built for — so this module uses that component directly,
  unlike VM, which needed its own `VulnerabilityStatusMenu` because its status route accepts
  the full enum. Confirming this distinction was Phase 2 work (§3.16); using it correctly
  here is what that groundwork was for.

No create form for endpoints, consistent with the backend: there's no manual create route,
endpoints only ever appear via `ingest()`'s upsert. Deleting an endpoint that still has
detections `409`s with a message that already names `DECOMMISSIONED` as the alternative —
surfaced as-is, no extra UI copy needed.

The `GET /users`-is-Admin-only constraint found while building VM's `AssignmentControl`
integration (§3.17) applied identically here, unmodified — the second data point that this
is a real, recurring constraint for every remaining module's list page, not a one-off.

Test suite: 30 files/164 tests → 32 files/179 tests (`edr-routes.test.ts`,
`endpoint-row-actions.test.tsx`). `tsc --noEmit`, `eslint`, `prettier --check`, and
`next build` all verified clean.

### 3.19 Eleventh pass: Phase 5 of the adaptation plan — the SIEM module (2026-08-07)

Same session, third of six module phases: `(dashboard)/siem` (alerts list — the real
replacement for what the mock dashboard alerts table had been standing in for since the
project's earliest passes) and `(dashboard)/siem/logs` (raw pre-alert events, read-only).

**A genuine open question, asked rather than silently decided:** the Phase 5 checklist in
`frontend/CLAUDE.md` flagged, in its own words, that `GET /siem/logs` "may not be worth a
dedicated page before there is a real user asking for it" and explicitly said to flag this
rather than pick silently. Asked directly before starting the phase; the answer was to build
both — the alerts list with full row actions, and a separate read-only logs page (source,
event type, severity, timestamp — no filters, no pagination, matching `listLogs`'s own
shape on the backend: it takes no query parameters or pagination at all) with no row actions,
since no `PATCH`/`DELETE` route exists for `SiemLog` in the first place.

SIEM's alert filter set matches VM's exactly (`SiemQueryDto`, like `VmQueryDto`, adds
`status` on top of the shared `BaseQueryDto`) rather than EDR's narrower one — a third data
point (after VM and EDR) that each module's actual DTO shape has to be checked individually,
not assumed from whichever module was built immediately before it. SIEM's alert status route
is a restricted `ESCALATED`/`RESOLVED` set like EDR's, so this module reuses the shared
`StatusTransitionMenu` directly, the same way EDR did — VM remains the one module needing a
bespoke status menu, not a growing pattern.

**No new component-level test file this pass, and that's a deliberate observation, not a
gap:** `AlertsTable` and `LogsTable` compose only already-tested shared components
(`AssignmentControl`, `StatusTransitionMenu`) or render read-only data with no interactive
logic of their own — the same reason `VulnerabilitiesTable`, `DetectionsTable`,
`EndpointsTable`, and `AssetsTable` never got dedicated test files across §3.17-§3.18 either,
only the interactive row-action components they compose did.

Test suite: 32 files/179 tests → 33 files/188 tests (`siem-routes.test.ts`). `tsc --noEmit`,
`eslint`, `prettier --check`, and `next build` all verified clean.

### 3.20 Twelfth pass: Phase 6 of the adaptation plan — the CTI module (2026-08-07)

Same session, fourth of six module phases, and the first one that's structurally different
from the previous three rather than a variation on the same shape: `(dashboard)/cti` (IOC
list, filter by type plus the shared date range, create/edit/delete).

**CTI is the one module with neither a status concept nor an assign concept, confirmed
against the controller rather than assumed by pattern-matching the other three.** No
`AssignmentControl`, no `StatusTransitionMenu` appear anywhere in this module — there's
nothing for them to attach to, `CtiIoc` has neither an `assignedToUserId` nor a status
field. What CTI has instead that VM/EDR/SIEM don't: a real edit form, and a real identity
constraint worth getting right — `UpdateCtiIocDto` only accepts `confidence`/`source`,
never `type`/`value`, because together those two are the IOC's identity (the unique key
`ingest()` upserts on). `IocRowActions`' edit dialog reflects that directly: no type/value
fields exist in it at all, not just disabled ones, and a test asserts they're absent rather
than merely untouched.

Also confirmed by reading `CtiService.query()` rather than assuming from `CtiQueryDto`'s
inherited fields: `severity` and `assignedToUserId` are destructured out of the filters
object but never referenced in the `where` clause, since `CtiIoc` has neither column — so
the page's filter bar only offers type and the date range, matching what actually has an
effect rather than offering controls that would silently do nothing.

Test suite: 33 files/188 tests → 35 files/201 tests (`cti-routes.test.ts`,
`create-ioc-form.test.tsx`, `ioc-row-actions.test.tsx`). `tsc --noEmit`, `eslint`,
`prettier --check`, and `next build` all verified clean.

### 3.21 Thirteenth pass: Phase 7 of the adaptation plan — the SOAR module (2026-08-07)

Same session, fifth of six module phases: `(dashboard)/soar`, two sections — playbook
CRUD and a read-only executions list.

**The first module with genuinely different RBAC from the other four, confirmed against the
controller rather than assumed from the established Admin-or-Analyst pattern:**
`SoarController`'s playbook mutation routes (`create`, `update`, `delete`) are
`@Roles(ADMIN)` only — Analysts, who could create/edit/delete assets, IOCs, and everything
else across VM/EDR/CTI, cannot touch a playbook. Reflected on the frontend as a dedicated
`requireAdmin` guard on those three Route Handlers (not the `requireAnalystOrAdmin` every
other module's mutation routes reuse), and `PlaybooksTable` rendering no actions column at
all for a non-Admin session, not merely a disabled one.

`actions` stays exactly what the plan called for: a raw JSON `<textarea>`, not a structured
form, since the backend genuinely validates it as an open object with no shape constraint
(SOAR execution is simulated by design, per the backend's own module-plan decision). Building
test coverage for that textarea surfaced a real, worth-remembering testing constraint:
`userEvent.type()`'s keyboard-input DSL treats `{` and `}` as the start/end of a
special-key sequence (e.g. `{enter}`), so typing literal JSON content through it — even with
the documented double-brace escape (`{{`/`}}`) — produced malformed strings in practice
rather than the literal braces intended. Resolved by using `fireEvent.change()` to set the
textarea's value directly for those specific assertions, while every other interaction in
the same tests (clicking buttons, typing into plain text fields) still goes through
`userEvent` as normal — not a wholesale abandonment of the higher-fidelity `userEvent` API,
just a targeted exception for the one input shape it doesn't handle cleanly.

Executions are read-only for every role, confirmed by reading the controller rather than
assuming from the model's "already terminal" framing: no assign or status route exists for
`SoarExecution` at all, so `ExecutionsTable` has neither `AssignmentControl` nor
`StatusTransitionMenu`, the same shape `LogsTable` took in §3.19 for the same reason (no
backend route to attach either component to).

Test suite: 35 files/201 tests → 38 files/216 tests (`soar-routes.test.ts`,
`create-playbook-form.test.tsx`, `playbook-row-actions.test.tsx`). `tsc --noEmit`, `eslint`,
`prettier --check`, and `next build` all verified clean.

### 3.22 Fourteenth pass: Phase 8 of the adaptation plan — the DFIR module, closing out all six (2026-08-07)

Same session, the sixth and last module phase: `(dashboard)/dfir` (incident list, same
filter set as VM/SIEM) and `(dashboard)/dfir/[id]` — DFIR's the one module with a real
per-record detail page (per decision 8 in the adaptation plan, the only backend route with a
dedicated `GET .../:id` returning more than the list view already has).

**The detail page is genuinely different work, not another list-page variation:** it shows
an incident's full `DfirLink[]` — its trace back to whatever record across the other five
modules led to it — via a `LinksTable` with an `Unlink` action per row, plus a manual
"link an existing record" form. That form's `sourceId` field is a raw UUID input, not
anything friendlier, because there genuinely is no id-typeahead or search endpoint on the
backend to build against — noted directly as a real limitation in both the code comment and
here, not silently worked around or silently left unmentioned. The nested dynamic route for
unlinking (`dfir/incidents/[id]/links/[linkId]`, two dynamic segments deep) required no
changes to Phase 2's `proxyToBackend()` helper at all — `params.id` and `params.linkId` both
just worked, a small but real validation that the helper's design generalizes past the
single-segment routes every other module needed.

Both the list and detail pages reuse Phase 2's shared `AssignmentControl` and
`StatusTransitionMenu` — DFIR's status route is a genuine three-value restricted transition
set (`ESCALATED`/`CONTAINED`/`RESOLVED`), the same shape SIEM and EDR's routes take, so no
DFIR-specific status menu was needed the way VM required one.

**With this phase, all six security modules (VM, EDR, SIEM, CTI, SOAR, DFIR) have real,
backend-wired frontend pages** — closing the single largest gap `frontend/CLAUDE.md` had
tracked since 2026-08-06, when the backend finished all six modules with nothing on the
frontend consuming any of it. The `(dashboard)/[module]` placeholder stub is now
unreachable for every module slug in practice, though not yet deleted (that's Phase 12,
which also needs to confirm nothing else still depends on `src/lib/nav.ts`'s
`isModuleSlug` guard first). What remains of the full adaptation plan — asset feed and
dashboard integration, real-time SSE delivery, tenant module activation UI, RBAC/nav
polish, and a final verification pass (Phases 9-13) — is infrastructure and integration
work across the now-complete module set, not more module-shaped work.

Test suite: 38 files/216 tests → 41 files/233 tests (`dfir-routes.test.ts`,
`link-record-form.test.tsx`, `links-table.test.tsx`). `tsc --noEmit`, `eslint`,
`prettier --check`, and `next build` all verified clean.

### 3.23 Fifteenth pass: Phase 9 of the adaptation plan — asset feed and dashboard integration (2026-08-07)

Same session, first of the five remaining phases and the last one that touches
`src/lib/mock-data.ts` — with this pass, every dashboard number and table in the app is real
backend data.

**A dedicated `(dashboard)/assets` page**, not a fold-into-the-dashboard — decided
explicitly per the plan's own instruction not to default to one without weighing the other.
Every other module already has its own list page with full filters and pagination, and the
unified feed (`GET /assets/feed`) genuinely needs the same: severity, "assigned to me", and
a date range, plus `NextOnlyPagination`. Folding it into the dashboard instead would have
meant either a second, weaker feed view living there, or losing the dashboard's own compact
glance. The resolution: build the full page, and have the dashboard's "recent activity"
panel reuse the exact same new `FeedTable` component (`src/components/assets/`) with a
small unpaginated slice of the same fetch — one real component in two places, not two
components that could quietly diverge. Each row shows severity, summary, source module
(badge), status, assignee, and a link — genuinely useful only for DFIR rows, which link to
the app's one real per-record detail page (`/dfir/:id`, closed out in §3.22); every other
source links to its own module's list page, since no other module has an addressable
per-record route to link to at all. That's the same "don't invent backend surface that
isn't there" discipline decision 8 already established for DFIR's detail page.

**The dashboard's four KPIs got a real design pass**, not a find-and-replace — the plan's
own decision 10 flagged this explicitly, and it turned out to matter. `AssetFeedEntry` has
no total-count endpoint behind it (confirmed again here, same as every module's list query),
so every number below is honestly scoped to one `GET /assets/feed?pageSize=100` fetch (the
backend's own page-size ceiling) — a snapshot of the most recent 100 events, not a claimed
tenant-wide total. The dashboard's own copy says so directly ("Based on the N most recent
events...") instead of implying more than it can back. Three of the four replacement KPIs
were straightforward: **Critical events** and **High severity** are plain counts over that
snapshot, and **Open records** needed a new `isOpenFeedEntry()` helper
(`src/lib/asset-feed.ts`) because "open" isn't one value across modules — VM's terminal
states are `REMEDIATED`/`ACCEPTED_RISK`, DFIR's are `CONTAINED`/`RESOLVED`, EDR and SIEM
both use `RESOLVED`, and CTI/SOAR never write a `status` onto their feed rows at all (so
they're excluded from the open/closed question entirely rather than miscounted).

**The fourth KPI is where the design pass earned its keep.** The mock version's fourth
number was "Resolved today" — and it turned out to have no honest replacement at all.
`AssetFeedEntry.timestamp` is the underlying record's _creation_ time; nothing in
`backend/src/asset/asset.service.ts`'s `applyStatusChange` (the handler that updates
`status` on a `*.status_changed` event) ever touches it. There is no "when did this become
resolved" data anywhere in this schema to answer "today" against. Rather than fake a number
or silently drop the KPI slot, it was replaced with **Assigned to me** — a count that _is_
honestly answerable from the same fetch and is a genuinely useful number for the analyst
looking at their own dashboard.

**The second breakdown panel needed the same honesty check.** The old mock
`mockTopAttackSources` panel implied a "top attacker IPs" view — a full read of the relevant
Prisma models (`SiemLog`, `SiemAlert`, `EdrDetection`, `VmVulnerability`) confirmed no module
stores a structured attacker-source-IP field consistently enough to aggregate one
(`SiemLog.source` is a free-text log-source name, not an IP; anything IP-shaped elsewhere
lives inside opaque `rawData` JSON with no guaranteed key). The plan's own decision 10 gave
two options — drop the panel, or mark it illustrative — and a third, better one presented
itself once real data was in hand anyway: replace it with a real breakdown the feed _does_
support, event volume by source module (`EventsByModule`, same bar-list visual as the
severity panel it sits beside). The dashboard keeps two real panels instead of one real and
one fake-labeled-as-real.

With every consumer replaced, `src/lib/mock-data.ts` itself was deleted rather than left
around as dead weight — `frontend/CLAUDE.md` had repeatedly warned against silently
extending it further; once nothing used it, removing it was the natural next step in the
same spirit.

Test suite: 41 files/233 tests → 42 files/243 tests (`assets-feed-route.test.ts`, the new
Route Handler's auth/RBAC/filter-forwarding/error-normalization paths;
`asset-feed-lib.test.ts`, `isOpenFeedEntry()`'s per-source terminal-status logic and
`hrefForFeedEntry()`'s DFIR-vs-everything-else mapping). No dedicated component test for
`FeedTable`/`EventsByModule`/`SeverityBreakdown` — same "read-only composition, no
interactive logic of its own" precedent §3.19 already established for SIEM's
`AlertsTable`/`LogsTable`. `tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all
verified clean; the build's route table confirmed both `/assets` and `/api/assets/feed`
registered correctly.

### 3.24 Sixteenth pass: Phase 10 of the adaptation plan — real-time delivery over SSE (2026-08-07)

Same session, the fourth of the five remaining integration phases: the backend's `GET
/events/stream` (a NestJS `@Sse` endpoint, streaming every module's `.created`/`.assigned`/
`.status_changed`/`.unassigned`/`.deleted` events, tenant-filtered server-side) finally has a
frontend consumer.

**The streaming proxy needed genuinely new ground, not a copy of `proxyToBackend()`.** That
helper — every other Route Handler in the app — calls `.json()` on the backend's response
before wrapping it in `NextResponse.json()`; against an endpoint that never closes, that
call would simply never resolve, and no byte would ever reach the browser. Per this
project's own standing rule (`AGENTS.md`: check `node_modules/next/dist/docs/` before
assuming a Next API works like prior training data), `01-app/02-guides/streaming.md`'s
"Streaming in Route Handlers" section was read directly before writing anything — it
confirmed this Next version's Route Handlers support returning a bare
`new Response(stream)`, the same as any other modern fetch-API-shaped runtime, no special
new construct needed. The route itself became almost trivial once that was confirmed:
`backendFetchAuthed("/events/stream").body` already _is_ a `ReadableStream` (fetch's own
response body), so it's forwarded untouched with the right `text/event-stream` headers —
no manual `TextEncoder`/chunk-loop construction like the docs' more general "chunk-by-chunk"
example needed, since there's nothing to transform.

**A real backend-shape finding surfaced immediately on the client side, and it reshaped the
rest of the phase.** NestJS's `@Sse` decorator maps every emitted event to a bare
`{ data: event }` `MessageEvent` — confirmed directly against
`backend/src/events/events.service.ts` — with no `event:`/`type` field set at all. That
means the browser's native `EventSource` receives every frame through its plain
`onmessage`, never a named-event listener, and the payload itself carries no field saying
"this was a create" versus "this was an assign." A new `classifyLiveEvent()` helper
(`src/lib/live-events.ts`) infers the kind from which fields are present instead — verified
field-by-field against every payload shape in `backend/src/common/security-module/types.ts`:
a non-null `assignedToUserId` means assigned; `recordId` plus `status` means a status
change (or an unassign, see below); `recordId` with no `status` means deleted; `severity`
with none of the above means a fresh `.created` record. **A second, narrower finding sat
inside that first one:** `status_changed` and `unassigned` events turned out to be
_genuinely indistinguishable_ from each other on the wire — both are emitted as the exact
same `RecordStatusChangedPayload` shape (see `backend/src/asset/asset.service.ts`'s own
comment explaining why it's one handler per module per event name, not one payload shape
per event name). This isn't a gap in the classifier; it's a real limit of what the backend's
event payloads carry, and the plan's own phrasing — "live status-pill updates on
`*.assigned`/`*.status_changed`/`*.unassigned` frames" — could only be honored as two
distinguishable kinds, not three, once that was known.

**The live-update mechanism itself was a deliberate simplification, made explicitly rather
than silently.** The plan's literal wording ("live-prepend on the list, live status-pill
updates ... for whichever records are currently rendered") describes patching individual
rows in place. Every table this phase touches (`FeedTable`, and eventually the six module
tables) is populated from a plain Server-Component-fetched prop today, not client-side
state a delta could merge into — building that properly would mean converting each of
those into a stateful client component first, a much larger refactor than this phase's
actual scope. It would also mean synthesizing a row from a partial SSE payload that never
carries the record's real `AssetFeedEntry.id` (that id is assigned by
`AssetService`'s own `@OnEvent` listener a moment after the same event fires the SSE frame,
not derivable from the event itself) — a real risk of showing something that doesn't
exactly match what the next real fetch would return. The resolution: every classifiable
frame triggers a debounced (500ms, coalescing bursts into one call) `router.refresh()` —
a genuine re-render of the current route's Server Component against real backend data. This
delivers the same _user-visible_ outcome (the list updates within half a second of a real
event) with none of the synthetic-data risk, at the cost of a full-tree re-render instead of
a targeted patch — a tradeoff worth revisiting only if that re-render is ever a measured
performance problem, not preemptively. The one piece of the plan built exactly as written:
a `sonner` toast fires on a new **critical**-severity `.created` event only, using a new
`describeCreatedEvent()` helper that mirrors `AssetService`'s own per-source summary
strings by hand.

**Decision 3's own "revisit once Phase 10 ships" note got a real answer, not a rubber
stamp.** The concern was whether a long-lived SSE connection, authorized once by a
15-minute access token, becomes a problem once that token's real lifetime has passed.
Checked directly against `backend/src/events/events.controller.ts`: NestJS's `@Sse`
endpoints run the normal Guard chain once, before the Observable is returned, with no
per-frame re-authorization mechanism at all — so yes, a tab left open past 15 minutes keeps
receiving events on the same connection, and that's simply how the backend's own guard
model works, not a frontend gap to patch around. The moment the connection actually drops
for any real reason (network blip, tab backgrounding, browser throttling),
`EventSource`'s native reconnect hits the Route Handler fresh, and the existing
lazy-refresh-on-401 in `backendFetchAuthed` already covers a genuinely expired session at
that point. No proactive client-side refresh timer was needed.

Test suite: 42 files/243 tests → 43 files/264 tests (`events-stream-route.test.ts` — the
streaming route's auth guard, error passthrough, and a real-`ReadableStream` success path,
deliberately not a full live-stream test per the plan's own note that byte-for-byte
streaming is better verified live than faked with a mock; `live-events-lib.test.ts` —
`classifyLiveEvent()`'s full decision table plus the toast helpers; `live-events.test.tsx` —
the `<LiveEvents />` client component against a small mock `EventSource` class, covering
toast-only-on-critical, debounced-refresh-on-every-classifiable-frame, burst-coalescing,
ignoring unrecognized frames, and connection cleanup on unmount). `tsc --noEmit`, `eslint`,
`prettier --check`, and `next build` all verified clean; the build's route table confirmed
`/api/events/stream` registered as a dynamic route.

### 3.25 Seventeenth pass: Phase 11 of the adaptation plan — tenant module activation UI (2026-08-07)

Same session, the fifth of the five remaining integration phases, and the one closing the
single most concrete gap root `../CLAUDE.md` had named since the backend finished all six
modules: `TenantModule` CRUD (`GET/POST/PATCH/DELETE /tenants/:id/modules[/:moduleName]`)
had existed on the backend the entire time with genuinely zero frontend surface, meaning
every tenant provisioned through the real API sat at zero active modules with no way for a
Super Admin to change that. `PATCH /tenants/:id` (rename) was in the same state — a real
backend route nothing on the frontend had ever called.

**The UI followed patterns this session had already proven, rather than inventing new
ones.** `RenameTenantButton` is a small dialog pre-filled with the current name, the same
"dialog, not inline-edit" shape `UserRowActions` and `PlaybookRowActions` already
established for every other rename/edit action in the app. The tenant detail page's new
"Modules" section — `TenantModulesTable`, `ActivateModuleForm`, `TenantModuleRowActions` —
leaned directly on Phase 7's SOAR work: `ActivateTenantModuleDto`'s `config` field is an
open, unconstrained object with no defined per-module shape anywhere in the codebase yet
(exactly SOAR's `actions` field's situation), so `config` is a raw JSON textarea rather than
a structured form built against a shape that doesn't exist, and
`TenantModuleRowActions`' edit dialog (an `isActive` toggle plus that same textarea) mirrors
`PlaybookRowActions`' edit dialog closely enough that it read almost like a direct
adaptation rather than new design work.

**One small addition went beyond the plan's literal wording, made because it was cheap and
obviously correct, not because it was asked for:** `ActivateModuleForm`'s module picker
filters out modules the tenant already has a `TenantModule` row for. `activateModule` on the
backend enforces one row per `(tenantId, moduleName)` pair via a real unique constraint and
409s on a duplicate — offering a choice guaranteed to fail would have been worse UX for a
one-line filter's cost. Re-activating or reconfiguring an already-active module is what the
row actions' edit dialog (PATCH) is for; the form is create-only, by construction.

**The Route Handlers split into two different conventions, deliberately, not
accidentally.** `PATCH /tenants/:id` was added directly into the existing
`tenants/[id]/route.ts`, in the same hand-rolled fetch-then-normalize-errors style as that
file's existing `DELETE` — both predate `proxyToBackend()`, and mixing a `proxyToBackend()`-
built `PATCH` into a file whose sibling handler is hand-rolled would have made the file
harder to read, not easier. The two new routes under `modules/**`, with no existing sibling
to stay consistent with, used `proxyToBackend()` — genuinely new surface is exactly what
that helper was built for (decision 6 in the adaptation plan). The nested dynamic segment
(`[id]/modules/[moduleName]`) needed no changes to the helper, the same thing Phase 8's DFIR
unlink route and Phase 9's asset routes had already proven for two-level dynamic paths.

**A real, if small, accessibility gap surfaced while writing tests, and was fixed at the
source rather than worked around.** The edit dialog's config textarea had no `<label>`
associated with it at all — every other form field in this app has one, this one simply
didn't get one when it was first written. Rather than reaching for the textarea by raw DOM
structure in the test (the path of least resistance, and the wrong one), a `FieldLabel` was
added to the component itself, matching the rest of the codebase, and the test used
`getByLabelText` like every other labeled-field test in the suite.

Test suite: 43 files/264 tests → 46 files/289 tests (extended `tenants-routes.test.ts` with
13 new cases covering `PATCH /api/tenants/:id` and the full modules CRUD surface — RBAC,
400/404/409 paths, and success paths for each route — plus
`rename-tenant-button.test.tsx`, `activate-module-form.test.tsx`, and
`tenant-module-row-actions.test.tsx`). `tsc --noEmit`, `eslint`, `prettier --check`, and
`next build` all verified clean; the build's route table confirmed both new dynamic routes
registered correctly. With this phase, every route in `frontend/CLAUDE.md`'s verified
backend route inventory has either a Route Handler plus a UI affordance, or one of the
plan's own documented exceptions (the `POST .../events` routes per decision 7, EDR's
missing manual-create) — Phase 13's final pass has nothing left to close, only to confirm.

### 3.26 Eighteenth pass: Phase 12 of the adaptation plan — RBAC and nav polish (2026-08-07)

Same session, mostly a confirmation pass rather than a fix pass — the kind of phase that
exists to verify a property holds, not to build something new, and worth documenting as
such rather than padding it into more than it was.

**The audit came first, deliberately, before touching any code.** The plan's own wording
for this phase assumed row-action components would need new Viewer-hiding logic added.
Rather than assuming that and writing speculative fixes, every one of the six module pages
plus the Phase 9 asset feed page was grepped directly for any `redirect(` call conditioned
on role — none exist; every role check in those pages only gates whether a create form
renders or whether the Admin-only `GET /users` call fires, never whether the page itself is
reachable. The same check was repeated for every row-action and table component:
`AssignmentControl`, `StatusTransitionMenu`, and VM's `VulnerabilityStatusMenu` all already
`return null` for `UserRole.VIEWER`; `EndpointsTable`, `IocsTable`, `AssetsTable`, and
`LinksTable` all already gate their own actions column on `currentUserRole !== "VIEWER"`.
`PlaybooksTable` was the one component that _doesn't_ follow that exact pattern — it gates
on `currentUserRole === "ADMIN"` instead — and checking it against §3.21's own record
confirmed that's correct as written: SOAR's mutation routes really are Admin-only, not
Admin-or-Analyst like every other module, so an Analyst seeing no actions column there is
the right behavior, not a Viewer-specific gap that happens to also catch Analyst.
**Conclusion: every module was already built Viewer-correct across Phases 3-8, and nothing
needed changing.** This is worth stating plainly rather than manufacturing a fix to justify
the phase — the discipline paid off during Phases 3-8 themselves, not here.

**The one real change was deleting dead code, and even that got re-verified rather than
assumed safe.** `(dashboard)/[module]/page.tsx` — the placeholder every module's nav link
pointed at before its real folder existed — had been unreachable for all six slugs since
Phase 8 finished DFIR, per Next's own routing rule that a static segment (`vm/`) always
resolves before a sibling dynamic one (`[module]/`) at the same level. That rule itself was
already proven once, empirically, back in Phase 3's build output. Rather than citing that
earlier proof and calling it sufficient, the same claim was re-verified here with the stub
actually gone: rebuild, and confirm `/[module]` is absent from the route table while every
real module route (`/vm`, `/edr`, `/siem`, `/cti`, `/soar`, `/dfir`, `/assets`, and their
sub-routes) is present and unaffected. `src/lib/nav.ts`'s `isModuleSlug`/`ModuleSlug`
exports — which existed only to support the now-deleted stub — were removed in the same
pass, after grepping the whole codebase to confirm nothing else referenced them (`MODULES`
itself stays; `SidebarNav` still needs it for the six module labels/links).

**One genuine, if minor, snag came up mechanically, not conceptually.** Immediately after
deleting the route, `tsc --noEmit` failed — not against any real source file, but against
`.next/dev/types/validator.ts` and `.next/types/validator.ts`, Next's own generated
route-type-checking files, both still referencing the just-deleted `[module]/page.js`.
These aren't regenerated by a plain file deletion on their own; `rm -rf .next` before
re-running `tsc` cleared it. Noted in `frontend/CLAUDE.md` as a general "deleted a route,
`tsc` still complains" fix, since it's a mechanical Next.js build-cache quirk that will
recur on any future route removal in this project, not something specific to this one file.

Test suite: unchanged at 46 files/289 tests — no test ever covered the stub route or
`isModuleSlug` (confirmed by grep before deleting), so nothing needed updating there.
`tsc --noEmit`, `eslint`, `prettier --check`, and `next build` all reverified clean after
the deletion (same one pre-existing, unrelated `eslint` finding as every prior pass).

### 3.27 Nineteenth pass: Phase 13 of the adaptation plan — final verification (2026-08-08)

The last phase of the adaptation plan, and the one built specifically to catch drift the
other eighteen passes might have let through — walking the route inventory and every
tracking document one more time with fresh eyes, rather than trusting that eighteen
consecutive "all clean" verifications meant nothing was left to find. Two things were.

**The route inventory walk itself confirmed the backend hadn't moved at all** — every
controller's route decorators were grepped fresh, not recalled from memory, and matched
the inventory exactly, route for route, with zero drift since 2026-08-07. But the
inventory's own _prose_ had drifted in two places even though the underlying frontend was
correct: the Tenants entry still said `PATCH :id` and the whole `modules` subtree had "no
frontend," true when that line was written but stale since §3.25 (Phase 11) actually built
all of it; and the Users entry's "all already wired" claim glossed over `GET :id`, which
turned out to have neither a Route Handler nor a caller anywhere in the frontend. That's not
a real gap — `UserRowActions`' edit dialog already holds the full user object from the
list page's one `GET /users` fetch, so a separate per-user fetch was never needed — but the
inventory should say that explicitly rather than imply blanket coverage it can't actually
back up. Both corrected in `frontend/CLAUDE.md` directly.

**The bigger finding came from actually running `git ls-files` instead of trusting what
earlier passes had written about it.** `__tests__/`, `__mocks__/`, and `docs/` — this very
file's home directory — had all been `.gitignore`d the entire time. Not "still gitignored
as of the last check" — genuinely zero tracked files and zero git history for all three,
confirmed directly, going back to before this session started. §3.14 (2026-07-28) found
this first and correctly reported it as unfixed. §3.15 (2026-08-07) then claimed, wrongly,
that it _had_ been fixed — a claim that directly contradicted `frontend/CLAUDE.md`'s own
changelog entry for that exact same pass, which correctly said it was found but not fixed.
That contradiction sat in two files, unresolved, for eleven more passes, because nothing in
those eleven passes ever ran the one command that would have caught it: `git ls-files
__tests__`. Every test-count number this report has stated since §3.14 was true in the
sense that the tests existed and passed locally — and false in the sense that none of them,
and none of this narrative describing them, had ever actually entered version control.
Fixed now: the three lines removed from `.gitignore`, and both false "closed" claims
corrected in place in §3.14 and §3.15 above rather than quietly rewritten, so the drift
stays visible the way this file's own convention asks for.

**A second, smaller finding fell directly out of fixing the first one.** Prettier 3.x
respects `.gitignore` by default. With `__tests__/` gitignored, every
`prettier --check "__tests__/**"` invocation this entire session — eighteen passes' worth
— had been silently checking nothing at all; the "clean" result each time only ever meant
`src/` was clean. The moment `__tests__/` came off `.gitignore`, the same command found 41
genuinely unformatted test files spanning nearly every phase since Phase 2. Reformatted all
of them and reverified end to end: 289/289 tests still passing, `tsc --noEmit` clean,
`next build` clean, and `prettier --check` back down to exactly the same 9 pre-existing
unformatted `src/` files this session has consistently left alone and never touched.

**Three more small, real drift spots surfaced from re-reading `frontend/CLAUDE.md`'s "Known
gaps" section start to finish**, rather than trusting the per-phase updates had kept it
perfectly current: the "Super Admin has no `/users/me`-equivalent" bullet's parenthetical
had claimed tenant deletion had no UI, a leftover from before `DeleteTenantButton` was
built back on 2026-07-16 — stale for the better part of a month and never caught by any
pass in between, including several that touched that exact bullet's neighbors. The "No
row-level actions on the alerts table" bullet described a mock table that stopped existing
in §3.19 (Phase 5). And a cross-reference to the `[module]/page.tsx` stub in the mock-data
bullet needed updating once §3.26 (Phase 12) deleted it. All three struck through and
corrected in place, matching the file's own established convention for visible drift
rather than silent rewrites.

None of this changes what was built in Phases 1-12 — every module, every integration
phase, every piece of UI described in §3.13 through §3.26 is exactly as real and as tested
as those sections say. What Phase 13 found was entirely in the _tracking_ — a repo that
never saw its own test suite, and two documents that occasionally told a slightly rosier
story about their own bookkeeping than was true. Worth stating plainly rather than
smoothing over, since the whole point of a phase like this is to surface exactly this kind
of thing.

Nothing staged or committed as part of this pass — per this project's own "commit only when
asked" convention, `git add`/`git commit` is the user's call, not something this session
does unprompted. `tsc --noEmit`, `eslint` (same one pre-existing, unrelated finding as
every prior pass), `prettier --check`, `next build`, and the full Jest suite were all run
one final time after every fix above, all clean.

### 3.28 A full frontend-backend adaptation audit, requested directly (2026-08-08)

Asked directly whether the app is "completely adapted to the backend," works, matches the
backend's mock data, and has no missing functionality — a broader, more literal check than
Phase 13's own route-inventory walk, and one that went past routes into field-level shape
matching and the backend's actual demo dataset.

**Type-level parity, checked exhaustively rather than sampled:** every mutation DTO under
`backend/src/**/dto/*.ts` (thirteen of them, across VM/EDR/SIEM/CTI/SOAR/DFIR/Tenants/Users/
Auth) was read side-by-side with its `src/lib/validations/*.ts` zod counterpart. Every Prisma
model backing the six modules was read side-by-side with its `src/types/*.ts` interface.
Zero drift found in either direction — every field, every optionality marker, every enum
value matches. This is strong, direct evidence for "completely adapted," not an inference
from routes existing.

**The backend's demo dataset was read in full, since that was asked about specifically.**
`backend/prisma/seed-modules.ts` (`npm run seed:demo` — 5 tenants, ~3500 rows across all six
modules, real enough to actually explore the app with) turned out to have a genuine bug: its
synthetic `AssetFeedEntry` rows for EDR/SIEM/VM/DFIR never copied over each source record's
own `status`/`assignedToUserId`, even though those exact values were sitting one property
name away in scope at the point each row was built, and even though the real `AssetService`
listeners this script explicitly says it mirrors always set them. The practical effect: a
tenant seeded with this script would show a full, correctly varied VM/EDR/SIEM/DFIR module
page (assignments and statuses all present and realistic), but the Asset Feed page and
dashboard KPIs built in Phase 9 — which read from `AssetFeedEntry`, not the module tables
directly — would show every single row as unassigned and unopenable-as-open, silently wrong
in a way a quick glance at "does data show up" wouldn't catch. Fixed directly in the backend
file (see `backend/CLAUDE.md`'s Phase 10 entry for the full account); the frontend code
itself needed no change — it was already correctly implementing what the real production
listeners do, the demo script just hadn't matched that.

**Backend test suite run for the first time this session**, for an independent
correctness signal beyond type-matching: 507 unit tests plus, after discovering a false
negative (a full-parallel e2e run hit spurious timeouts from `argon2.hash` CPU contention
across 11 concurrent Jest workers in this sandbox — re-run serially with `--runInBand`, all
green, confirming it was resource contention, not a real failure), 187 e2e tests — 694 total,
all passing. The three most recent backend commits' diffs were also read directly rather than
assumed to be irrelevant, confirming they're exactly what `frontend/CLAUDE.md`'s "2026-08-07
backend hardening pass" note already said: refresh-token race-condition hardening, an atomic
lockout counter, and CTI ingest concurrency-safety — all backend-internal, none of them
change any response shape or route the frontend depends on.

No live browser/E2E run against the real backend was possible in this pass either — this
sandbox still has no Docker/Postgres, unchanged since every earlier disclosure of that
constraint in this report. What's here is the most rigorous _static_ verification available
without one: exhaustive type parity, a real bug found and fixed in the one dataset meant to
demonstrate the app, and a fully green test suite on both sides.

### 3.29 `/code-review` pass over §3.27–§3.28's diff (2026-08-08)

A full-branch automated code review, run against everything §3.27 and §3.28 had changed.
Six findings came back; all six were real, and all six were fixed rather than triaged into
"acceptable" — none were plan-mandated tradeoffs or false positives worth arguing with.

Two were doc-accuracy bugs in `frontend/CLAUDE.md` itself, ironic given §3.27's own closing
claim that "the standard was verify, don't assume": its Phase 13 entry asserted
`prettier --check` was down to "exactly the same 9 pre-existing unformatted `src/` files,"
but that was already false the moment it was written — `docs/superpowers/specs/2026-07-28-
password-change-request-flow-design.md` had just been un-gitignored by that same phase and
was never actually run through `prettier --write`, since the reformatting effort that phase
describes was scoped to `__tests__/` only. The true count was 10, not 9. Fixed the honest
way: formatted the spec file (its asterisk-style emphasis brought in line with the rest of
the repo's Markdown, which uses underscores) so the claim is genuinely true again, rather
than editing the sentence to describe the bug away. The stale claim itself was left in place
in CLAUDE.md with a correction note threaded in, per that file's own established convention
of making drift visible instead of quietly rewriting history.

The other four were real test-suite hygiene findings, all in the Route Handler test files
added across Phases 3–13: a byte-for-byte-identical `setSession()` cookie-store mock (the
`get`/`set`/`delete` stub object plus its `next/headers` wiring) had been copy-pasted across
11 files rather than shared, and 9 of those 11 hardcoded the literal string `"secops_token"`
instead of importing the real `SESSION_COOKIE` constant the way the other 2 already did —
meaning a future rename of that constant would silently break 9 test files for a reason
that wouldn't look related to the rename at all. Extracted the store-building logic into a
new `setSessionCookie(mockedCookies, token)` helper in `test-utils.ts`, alongside the
already-shared `fakeToken`/`mockJsonResponse`. One real constraint shaped the extraction:
Jest's hoisting (`babel-plugin-jest-hoist`) only rewrites `jest.mock(...)` calls it finds
literally in the file being compiled, so the `jest.mock("next/headers", ...)` registration
itself can't move into a shared helper — confirmed against how the hoisting actually works
before assuming a full extraction was possible, only the store-building logic behind it
could be shared. All 11 files (plus the 2 that already imported `SESSION_COOKIE` correctly,
for consistency) now call the shared helper. Separately, `tenants-routes.test.ts` had two
near-identical request builders, `req()` and `reqMethod()` — the former was a hardcoded-to-
POST duplicate of the latter, added earlier and never simplified once `reqMethod()` existed.
Collapsed to one: `req(body)` is now just `reqMethod("POST", body)`.

The sixth finding — that removing `.gitignore`'s `__tests__`/`__mocks__`/`docs` exclusion
(§3.27) added no automated guard against the same three directories being re-ignored later
— is real but not something this pass fixed with new code; it's the same gap the "No CI"
backlog item already tracks (§4), left there rather than duplicated into a separate
one-off note.

Full verification re-run after every change, not just the touched files: 289/289 tests
(unchanged — this was a test-infrastructure refactor, not new coverage),
`tsc --noEmit`/`eslint --max-warnings=0`/`next build` all clean, and `prettier --check` back
to the true 9-file baseline the corrected CLAUDE.md claim now accurately describes.

---

## 4. Current State Summary

**Completed and live-verified against the real backend:**

- Full authentication flow: login, forced password change (voluntary self-service change was
  removed 2026-07-28, §3.14 — replaced by a request-to-Admin flow), forgot-password (with
  copy matching the backend's actual admin-notification behavior, not an email-link flow it
  doesn't have), refresh-token rotation with a lazy on-401 retry (§3.15), and logout that
  actually revokes the session server-side instead of just clearing a local cookie.
- httpOnly-cookie BFF auth architecture, with neither the access token nor the refresh token
  ever reaching client-side JavaScript, and two independent layers of route protection
  (`proxy.ts` optimistic + per-page `requireSession()`) on top of the backend's own guards.
- Role-conditional dashboard shell and Security Overview page for all four roles, including a
  distinct Super Admin view (no tenant to scope KPIs to).
- Admin user management — list, create, edit, change role, reset password, and delete
  subordinate users — wired to the real backend, including both self-target rejections
  verified live.
- Super Admin tenant provisioning (create tenant + first Admin atomically, list and delete
  tenants), wired to the real backend — closing the one remaining gap where only a database
  seed script could create the platform's first tenant.
- A dedicated security review pass found and fixed one CSRF gap in the login flow; no injection
  or XSS findings.
- A full live smoke test exercising the entire provisioning chain end-to-end against a real,
  freshly migrated and seeded Postgres/NestJS backend, not just static analysis.
- Tenant deletion (confirm-dialog-gated, live-verified), the Figure 1 split-panel login screen,
  and a generated brand favicon.
- A Jest + RTL test suite: 8 files, 32 tests — `proxy.ts`'s full redirect matrix, a CSRF
  regression test, and validation/success/error-path coverage for every auth/user/tenant form
  in the app (login, change-password, forgot-password, create-user, create-tenant,
  delete-tenant).
- A project-hygiene audit: security response headers (CSP, `X-Frame-Options: DENY`, and four
  others, mirroring the backend's `helmet()` decision), custom error/not-found/loading pages
  (with a real dynamic-rendering regression caught via the build output and fixed before
  landing), Prettier wired up across the whole codebase, and Node version pinning matching
  what's actually installed and the backend's CI.

**Completed and build/test-verified, but not yet live-browser-verified** (no Docker/Postgres
available in this sandbox to run a real backend against; owed at a machine that has both —
true since §3.13 and still true through §3.27):

- Everything under §3.13 through §3.27: the CSRF Content-Type guard extended to
  `forgot-password`; full test coverage for `UserRowActions` and every Route Handler under
  `/api/users/**` and `/api/tenants/**`; `GET /users` pagination; the pending-password-reset
  badge/tint in `UsersTable`; the Super Admin tenant detail page; the password-change
  request flow (§3.14); the full refresh-token migration (§3.15); Phase 2's shared
  foundation types/helpers/components (§3.16); **all six security modules, Phases 3-8,
  each wired to real backend routes**: VM's vulnerability list/filters/pagination and asset
  CRUD (§3.17); EDR's detection list/filters/pagination and endpoint edit/delete (§3.18);
  SIEM's alerts list/filters/pagination plus a read-only logs page (§3.19); CTI's IOC
  list/filters/pagination and full create/edit/delete, the first module with neither a
  status nor an assign concept (§3.20); SOAR's Admin-only playbook CRUD plus a read-only
  executions list, the first module with different RBAC from the rest (§3.21); and DFIR's
  incident list plus the app's one real per-record detail page, tracing an incident's links
  back across the other five modules (§3.22, the last module, closing this gap out
  entirely); **the asset feed and dashboard integration, Phase 9** (§3.23): a dedicated
  `(dashboard)/assets` page, the dashboard's KPIs/breakdown panels/recent-activity table all
  now driven by real `GET /assets/feed` data, and `src/lib/mock-data.ts` deleted — the last
  mock data anywhere in the frontend is gone; **real-time SSE delivery, Phase 10**
  (§3.24): a streaming Route Handler proxying the backend's `GET /events/stream`, and a
  `<LiveEvents />` client component driving a critical-event toast and a debounced live
  refresh on the dashboard and the asset feed page; and **tenant module activation UI,
  Phase 11** (§3.25): the tenant detail page's new "Modules" section
  (`TenantModulesTable`/`ActivateModuleForm`/`TenantModuleRowActions`) covering the full
  `TenantModule` CRUD surface, plus a rename action wired to `PATCH /tenants/:id` — the
  single most concrete "no frontend at all" gap this file had tracked is closed; and
  **RBAC/nav polish, Phase 12** (§3.26): confirmed every module was already Viewer-correct
  across Phases 3-8 (an audit, not a fix), and deleted the now-fully-superseded
  `(dashboard)/[module]/page.tsx` stub and `src/lib/nav.ts`'s `isModuleSlug` guard after
  re-verifying Next's routing precedence against a real rebuild; and **the final
  verification pass, Phase 13** (§3.27): the full adaptation plan's route inventory
  re-walked and confirmed accurate, two stale spots in the inventory's own prose corrected,
  and a real, previously-uncaught gitignore bug found and fixed — `__tests__/`, `__mocks__/`,
  and `docs/` had never once been tracked in git for this entire session, despite two
  earlier passes incorrectly claiming otherwise (both corrected in place, see §3.27's own
  account). With this phase, the adaptation plan `frontend/CLAUDE.md` laid out on
  2026-08-06 is complete — all thirteen phases done.
- Verified instead via: `tsc --noEmit`, `eslint`, `prettier --check`, the full Jest suite
  (both repos), and `next build` (confirming every new route compiles and appears correctly
  in the route table) — plus, where applicable, actually running the backend's e2e suite
  despite the missing database, since its spec files mock `PrismaService` rather than
  needing a live connection.

**Explicitly deferred / not yet built** (the adaptation plan itself is complete — see
`frontend/CLAUDE.md`'s functionality backlog for anything smaller that's surfaced since;
everything below is cross-cutting infrastructure that was never part of the thirteen-phase
plan to begin with):

- Any e2e/Playwright layer for the frontend — the live curl/manual smoke tests done across
  earlier passes aren't automated or regression-proof. Frontend is at 289 tests
  (unit/component only) against the backend's larger unit + e2e suite.
- **CI** — the backend has it (`.github/workflows/test.yml`), the frontend doesn't yet.
  Explicitly scoped out of the 2026-07-16 hygiene pass rather than missed; still the
  highest-value item on the frontend's "Polish / infra" backlog, and more actionable now
  that `__tests__/`/`__mocks__/`/`docs/` are no longer gitignored (Phase 13, §3.27) and
  there's a much larger suite for CI to actually run — though note those directories are
  fixed in `.gitignore` only, not yet staged or committed (the user's call, not made by this
  session), so CI still can't see them until that happens.
- No Dockerfile on either side of the repo, no pre-commit hooks on either side — noted as
  project-wide gaps, not frontend-specific ones.

---

## 5. Key Engineering Decisions & Rationale (quick reference)

The recurring theme across this work mirrors the backend's: **defense-in-depth, verified rather
than assumed.** The auth architecture deliberately layers an optimistic check (`proxy.ts`) on top
of a real one (`requireSession()` per page) on top of the actual authorization boundary (the
backend's guards) — the same "more than one layer where practical" principle the backend report
identifies as its own core theme. And as with the backend's timing-side-channel finding, the one
real vulnerability found here (login CSRF) passed every functional check — the login flow worked
correctly for every legitimate case tested — because a CSRF gap is not a functional-correctness
question. It only surfaces when a piece of code is deliberately re-read against
attacker-motivated questions, which is what the dedicated `/security-review` pass was for.

A second theme specific to this frontend phase: **this Next.js/React/zod release set has real,
non-obvious breaking changes from more commonly documented versions** (§3.9) — `middleware.ts` →
`proxy.ts`, Base UI instead of Radix under shadcn, `form.tsx` replaced by `field.tsx`,
`FormEvent`'s deprecation, `zod`'s top-level format validators. Every one of these was caught by
actually running the compiler/linter/build and reading the locally bundled documentation
(`node_modules/next/dist/docs/`) rather than relying on general familiarity with earlier
versions of these tools — the project's own `AGENTS.md` file states this explicitly, and it held
up as an accurate warning in practice at least five separate times during this work.

Both themes recurred in §3.13: the `forgot-password` CSRF gap was the exact same class of bug
as the login one from §3.7, missed the first time for the same reason (functional tests all
passed; a CSRF gap only shows up under a deliberately attacker-framed re-read) — a reminder
that fixing one instance of a bug class doesn't sweep the codebase for siblings, that's a
separate, explicit step. And the backend e2e regression was only caught because "this sandbox
has no database, so e2e can't be re-verified" was itself checked rather than assumed true —
it turned out both e2e spec files mock `PrismaService` and needed no live connection at all.
