# Password change enforcement + request flow

Date: 2026-07-28
Status: implemented and verified (backend + frontend)
Cross-repo: this feature spans `backend/` (this file) and `frontend/` (mirrored at
`frontend/docs/superpowers/specs/2026-07-28-password-change-request-flow-design.md`).

## Motivation

Reported symptom: a newly created user (any role except Super Admin, who is seeded not
created) was not being forced to change the temporary password someone else set for them —
they could use the app normally without ever being prompted.

## Root cause (found by live verification, not assumed)

The initial hypothesis was a frontend gap — that nothing redirected a forced user to
`/change-password`. Live-testing that hypothesis (creating a real tenant/Admin through the
running API and inspecting the login response) disproved it: `frontend/src/proxy.ts`
already redirects on `session.mustChangePassword`, and it worked.

The real bug was in the backend: `UsersService.createUser` (used by both `POST /users` and,
via `TenantsService.createTenantWithAdmin`, a tenant's first Admin) never set
`mustChangePassword: true` on creation — it relied on the Prisma column default
(`@default(false)`). Confirmed empirically: a freshly created Admin's login response showed
`mustChangePassword: false`. Every new account, at every level (first Admin, co-Admin,
Analyst, Viewer), skipped the forced-change flow entirely. The frontend redirect logic had
nothing to redirect on.

## Decisions

Two scoping questions were resolved with the user before implementation:

1. **Does removing voluntary self-service password change apply to Admins too, or only
   non-Admin roles?** → **All roles, including Admins.** Nobody changes their own password
   after normal login; everyone uses a "request" flow that notifies whoever is above them.
2. **Who is notified when a non-Admin (Analyst/Viewer) requests a change?** → **Only the
   tenant's first-created Admin** (by `createdAt`), not a broadcast to every co-Admin — same
   single-recipient rule as the Admin-initiated case the user specified directly: "if an
   admin wants to change the password the very first created admin should be notified; if
   the sole/first admin wants to change their own, Super Admins should be notified."

This gives one consistent rule: **one designated recipient per tenant** (the earliest-created
Admin, computed live via `createdAt`, not stored — so it stays correct if that Admin is later
deleted), with Super Admins as the escalation path when that designated recipient is the one
requesting.

## Backend changes

- `UsersService.createUser`: added `mustChangePassword: true` to the `prisma.user.create`
  data. (`src/users/users.service.ts`)
- `TenantsService.createTenantWithAdmin`: same fix for a tenant's first Admin.
  (`src/tenants/tenants.service.ts`)
- `UsersService.changePassword`: now throws `ForbiddenException` if the fresh DB value of
  `user.mustChangePassword` is already `false` — restricts `PATCH /users/me/password` to
  completing the mandatory first-time change only. Checked against the DB value (re-fetched
  in this method already), not the JWT claim, so a stale token can't incorrectly block a
  change that's actually still required.
- New `UsersService.requestOwnPasswordChange(userId)`: sets `passwordResetRequestedAt` on
  the caller's own row. No old/new password involved — a flag, not a mutation.
- New `UsersService.hasPendingPasswordRequestsForAdmin(adminId, tenantId)`: returns `true`
  only if `adminId` is the tenant's first-created Admin AND some other user in the tenant has
  a pending request. A non-first Admin (co-Admin) always gets `false` here — they can still
  see raw per-row status by browsing `(dashboard)/users` (unchanged), just no ambient ping.
- New `UsersService.hasPendingPasswordRequestsForSuperAdmin()`: returns `true` if any tenant's
  first-created Admin has a pending request against themselves. Implemented by fetching the
  (typically tiny) set of pending Admins and checking each against their tenant's
  first-created Admin — O(pending admins), not O(all admins).
- New routes on `UsersController`:
  - `POST /users/me/request-password-change` — any authenticated non-forced user.
    Blocked by the existing `MustChangePasswordGuard` while `mustChangePassword` is true
    (no `@SkipPasswordCheck()`), so it's unreachable during the mandatory-change window —
    correct, since that path uses the real change endpoint instead.
  - `GET /users/me/pending-password-requests` (`@Roles(ADMIN, SUPER_ADMIN)`) → `{ hasPending:
boolean }`. Branches on caller role: Super Admin gets the platform-wide check, Admin gets
    the tenant-scoped one.
- No new migration — `passwordResetRequestedAt` already existed (previously only used by the
  unauthenticated `POST /auth/forgot-password` flow) and is already cleared to `null` by
  `applyPasswordReset` on any password reset.

## Frontend changes

- `lib/session.ts`'s `requireSession()` gained an `{ allowMustChangePassword?: boolean }`
  param (default `false`); when the session's `mustChangePassword` is true and the flag isn't
  passed, it redirects to `/change-password` before the caller renders anything. This closes
  a real gap in the frontend's own documented "two redundant layers" architecture: `proxy.ts`
  already checked the flag, but `requireSession()` — described in `frontend/CLAUDE.md` as
  _the_ real per-page boundary — didn't. Every existing call site keeps calling it with no
  args; only `(auth)/change-password/page.tsx` passes `{ allowMustChangePassword: true }`,
  since it has to stay reachable to clear the flag.
- `components/auth/change-password-form.tsx`: dropped the now-dead `forced` prop — this
  component only ever renders for the mandatory first-time change now, so the field label is
  hardcoded to "Temporary password".
- New `components/auth/request-password-change-form.tsx`: a single button, no fields. POSTs
  to the new proxy route and shows the same style of confirmation copy as the existing
  logged-out forgot-password flow.
- `(auth)/change-password/page.tsx`: renders `ChangePasswordForm` when `forced`, otherwise
  `RequestPasswordChangeForm`.
- New proxy route `app/api/users/me/request-password-change/route.ts` (POST, no body),
  modeled on the existing `users/me/password/route.ts` pattern.
- `(dashboard)/layout.tsx`: for `ADMIN`/`SUPER_ADMIN`, fetches
  `GET /users/me/pending-password-requests` and passes `hasPendingPasswordRequest` down.
- `components/dashboard/sidebar-nav.tsx`: `NavLink` gained a `showDot` prop; a small red dot
  renders on the "Users" link (Admin) or "Tenants" link (Super Admin) when true. The existing
  amber "Password reset requested" per-row badges on `(dashboard)/users` and
  `(dashboard)/tenants/[id]` are untouched — those already show raw status to anyone browsing
  the page; only the ambient sidebar ping is restricted to the single designated recipient.

## Verified (live, against the running dev backend + frontend, not just unit tests)

- Fresh tenant + first Admin via `POST /tenants` → `mustChangePassword: true`.
- Fresh subordinate via `POST /users` → `mustChangePassword: true`.
- A forced user's token is rejected on normal routes (403) and on
  `POST /users/me/request-password-change` (403, blocked by the guard) until they complete
  the change via `PATCH /users/me/password`.
- Once not forced, `PATCH /users/me/password` is rejected (403) — voluntary self-change is
  gone.
- `request-password-change` → the tenant's first Admin's `hasPending` flips `true`; a
  co-Admin (not tested live here, covered by unit tests) would stay `false`.
- The first Admin's own request never flips their own `hasPending` — it flips the Super
  Admin's instead.
- Resetting the requester's password (existing `POST /users/:id/reset-password`) clears
  `passwordResetRequestedAt`, and `hasPending` flips back to `false`.
- Same sequence re-verified end-to-end through the actual Next.js frontend (real httpOnly
  cookies via `/api/auth/login`, real redirects via `proxy.ts` + `requireSession()`, real
  rendered HTML showing the red dot marker) — not just direct backend API calls.
- Backend: `npm test` (130 tests) and `npm run test:e2e` (62 tests) green.
- Frontend: `npx tsc --noEmit` clean, `npm test` (97 tests) green.

## Explicitly out of scope (not asked for, not built)

- Broadcasting to every co-Admin — deliberately rejected by the user in favor of a single
  designated recipient.
- Any UI for a Super Admin to see _which_ tenant/Admin is pending beyond the sidebar dot —
  the existing `(dashboard)/tenants/[id]` page already shows the per-row badge once they
  click in; no new page was requested.
- Rate-limiting `POST /users/me/request-password-change` — no abuse scenario was raised, and
  the analogous unauthenticated `POST /auth/forgot-password` already has no per-endpoint
  throttle beyond the controller-wide one.
