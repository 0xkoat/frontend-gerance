import { test, expect } from "@playwright/test";
import { submitLoginForm, paceAuthCall, submitForgotPassword } from "./helpers";
import { DEMO_ADMIN } from "./fixtures/accounts";

// Deliberately makes as few real POST /auth/* calls as this suite's
// coverage allows, and every one of them goes through helpers.ts's paced
// wrappers — see paceAuthCall()'s doc comment for why. Every other spec
// file reuses a pre-authenticated storageState instead of logging in
// through the UI; this file is the one place that's unavoidable, since
// login/logout is literally what it's testing.
test.describe("Auth", () => {
  test("wrong password is rejected with no account-existence hint, then the right password succeeds", async ({
    page,
  }) => {
    await submitLoginForm(page, DEMO_ADMIN.email, "definitely-not-the-password");

    // Stays on /login with a generic error, not a silent redirect and not
    // a hint about whether the email itself is valid.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Invalid credentials")).toBeVisible({
      timeout: 10_000,
    });

    // Same page, now with the right password — proves the rejection above
    // was password-specific, not the form/page being broken.
    await paceAuthCall();
    await page.locator("#password").fill(DEMO_ADMIN.password);
    await page.getByRole("button", { name: "Sign in to SecOps" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText("Security Overview")).toBeVisible();
  });

  test("logout clears the session and protected routes redirect to /login", async ({
    page,
  }) => {
    await submitLoginForm(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

    await paceAuthCall();
    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/login"));

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("forgot-password returns an identical message whether or not the email exists (anti-enumeration)", async ({
    page,
  }) => {
    await submitForgotPassword(page, DEMO_ADMIN.email);
    const existentText = await page
      .getByText(/administrator has been notified/i)
      .textContent();
    expect(existentText).toBeTruthy();

    await submitForgotPassword(page, `nonexistent-${Date.now()}@example.com`);
    const nonexistentText = await page
      .getByText(/administrator has been notified/i)
      .textContent();

    expect(nonexistentText).toBe(existentText);
  });
});
