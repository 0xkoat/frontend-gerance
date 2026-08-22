import { type Browser, type Page, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * `AuthController` (login/refresh/logout/forgot-password — see
 * backend/src/auth/auth.controller.ts) shares ONE `@Throttle({ limit: 5,
 * ttl: 60000 })` budget per IP across all four routes, with no explicit
 * `blockDuration` (defaults to the full 60s `ttl`) — so tripping it doesn't
 * just reject one request, it blocks *every* auth-controller call from this
 * machine for a full 60 seconds. Confirmed live: this suite's first attempt
 * hit repeated 429s the moment more than 5 requests landed within a minute.
 * `@nestjs/throttler`'s storage decays each hit individually exactly
 * `ttl` after it was recorded (a true sliding window, verified by reading
 * `ThrottlerStorageService.increment` directly rather than assuming), so
 * spacing every real auth-controller request at least `60000 / 5 = 12000`ms
 * apart — with a safety margin — guarantees the count never exceeds the
 * limit in any 60s window and the block never trips at all. Every helper
 * below that hits the auth controller (`login`, `logout`,
 * `submitForgotPassword`) funnels through `paceAuthCall()`, which is a
 * a shared timestamp file under `e2e/.auth/` (already gitignored, and
 * already the home for this suite's storageState files) rather than a
 * module-level variable — found necessary the hard way: `playwright.config.
 * ts`'s `dependencies: ["setup"]` relationship between the "setup" and
 * "chromium" projects gives each project its own worker process, so a
 * plain in-memory timestamp in the "setup" project's process was invisible
 * to the "chromium" project's process and every spec file re-started
 * pacing from zero — reproduced live (the very next auth-controller call
 * after "setup" finished fired immediately, tripping the block). A file
 * survives the process boundary; the read-then-write below isn't
 * concurrency-safe in general, but `workers: 1` means there's never a
 * second writer to race against.
 */
const AUTH_CALL_MIN_SPACING_MS = 13_000;
const PACE_FILE = path.join(__dirname, ".auth", "last-auth-call-at");

export async function paceAuthCall() {
  fs.mkdirSync(path.dirname(PACE_FILE), { recursive: true });
  const lastAuthCallAt = fs.existsSync(PACE_FILE)
    ? Number(fs.readFileSync(PACE_FILE, "utf-8"))
    : 0;
  const wait = lastAuthCallAt + AUTH_CALL_MIN_SPACING_MS - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  fs.writeFileSync(PACE_FILE, String(Date.now()));
}

/**
 * Log in through the real /login form and wait for the post-login redirect
 * (dashboard, or /change-password for a forced first-login). Using
 * `waitForURL` rather than `waitForLoadState("networkidle")` matters here:
 * the login button's own client-side submit briefly shows "Signing in..."
 * before the redirect fires, and networkidle can resolve before that
 * redirect actually happens, making the very next assertion race the app.
 */
export async function login(page: Page, email: string, password: string) {
  await paceAuthCall();
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in to SecOps" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
}

/** For asserting a login *rejection* (wrong password) — same paced /login submit as `login()`, without waiting for a redirect that isn't coming. */
export async function submitLoginForm(
  page: Page,
  email: string,
  password: string,
) {
  await paceAuthCall();
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in to SecOps" }).click();
}

/**
 * Log in as a second, unrelated identity to check what happens to *them*
 * (a brand-new account's forced first-login redirect, an admin-reset
 * account's forced-change-again) without disturbing the calling test's own
 * session. `page.context().newPage()` is the wrong tool for this — a new
 * page in the *same* browser context still shares that context's cookie
 * jar, so logging in there silently overwrites the original page's session
 * cookies too (found live: it broke the calling Super Admin/Admin page's
 * own session, not just added a second one). A genuinely new
 * `browser.newContext()` has its own cookie jar — but only if
 * `storageState` is explicitly cleared. Found live, the hard way:
 * Playwright uses the current test's `test.use({ storageState: ... })`
 * as the *default* for any `browser.newContext()` call made inside that
 * test, not a blank slate — so the first version of this helper silently
 * inherited the calling test's own session, `/login` redirected straight
 * back to `/dashboard` for an already-authenticated user, and `login()`'s
 * next line (`page.locator("#email").fill(...)`) then hung for the full
 * test timeout waiting on a `#email` input that was never going to appear
 * on that page. `storageState: undefined` is what actually gets a clean,
 * logged-out context. Callers are responsible for closing the returned
 * context when done.
 */
export async function loginInIsolatedContext(
  browser: Browser,
  email: string,
  password: string,
) {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await login(page, email, password);
  return { context, page };
}

export async function logout(page: Page) {
  await paceAuthCall();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/login"));
}

/** Paced wrapper around the forgot-password form's submit — same shared auth-controller budget as login/logout. */
export async function submitForgotPassword(page: Page, email: string) {
  await paceAuthCall();
  await page.goto("/forgot-password");
  await page.locator("input[type=email]").fill(email);
  await page.getByRole("button", { name: "Send reset request" }).click();
}

/**
 * Click a dialog/alertdialog's confirm button and wait for the dialog to
 * actually close, rather than a fixed sleep. Every mutation in this app
 * (create/edit/delete forms) is a client-side fetch behind a Base UI
 * dialog — the dialog staying open (showing a "Saving..." button label) is
 * itself the correctly-shaped signal that the request is still in flight;
 * asserting page state before it closes is a false negative, not a real
 * bug. `[role=alertdialog]` covers destructive-confirm dialogs (delete
 * tenant/user), `[role=dialog]` covers every other form dialog.
 *
 * Operates on `.last()` — Base UI's exit transition can leave the
 * previous dialog's node briefly matching `[role=dialog]` for a frame or
 * two after a new one has already opened (observed once, not reliably
 * reproducible in isolation, so treated as a real render-timing edge case
 * rather than "flaky, ignore"); targeting the most-recently-opened dialog
 * avoids a strict-mode ambiguity from that overlap without masking a
 * genuine case where no dialog opened at all (`.last()` on zero matches
 * still fails clearly, it just doesn't throw on >1).
 */
export async function clickAndWaitForDialogClose(
  page: Page,
  buttonName: string | RegExp,
) {
  const dialogs = page.locator("[role=dialog], [role=alertdialog]");
  const dialog = dialogs.last();
  await dialog.getByRole("button", { name: buttonName }).click();
  await expect(dialogs).toHaveCount(0, { timeout: 8_000 });
}

/**
 * Open a table row's "..." row-action menu. Every row-actions component in
 * this app (tenants, users, module records, tenant modules) renders the
 * trigger as the last button in the row.
 */
export async function openRowMenu(page: Page, rowText: string) {
  const row = page.locator("tbody tr").filter({ hasText: rowText }).first();
  await row.locator("button").last().click();
}

/**
 * Select an option from one of this app's Base UI `<Select>` triggers
 * (role=combobox). Clicking the listbox option directly is flaky under
 * Base UI's portal-rendered popup in this app (observed during manual
 * testing) — keyboard navigation is the reliable path instead.
 */
export async function selectByKeyboard(
  page: Page,
  trigger: ReturnType<Page["locator"]>,
  downPresses: number,
) {
  await trigger.click();
  for (let i = 0; i < downPresses; i++) {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
}

/** A short, unique-enough suffix so parallel/repeated test runs don't collide on unique fields (emails, tenant names). */
export function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}
