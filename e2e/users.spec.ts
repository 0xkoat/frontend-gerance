import { test, expect } from "@playwright/test";
import { clickAndWaitForDialogClose, loginInIsolatedContext, openRowMenu, uniqueSuffix } from "./helpers";

test.use({ storageState: "e2e/.auth/demo-admin.json" });

test.describe("Users (Admin)", () => {
  test("create, edit, change role, reset password (forces change again), then delete a subordinate user", async ({
    page,
    browser,
  }) => {
    const suffix = uniqueSuffix();
    const email = `e2e-playwright-user-${suffix}@example.com`;
    const initialPassword = "E2ePlaywrightUser1!";
    const resetPassword = "E2ePlaywrightUser2!";
    let userName = `E2E PW User ${suffix}`;

    await page.goto("/users");

    try {
      // --- create ---
      await page.locator("input[name='name']").fill(userName);
      await page.locator("input[name='email']").fill(email);
      await page.locator("input[name='phoneNumber']").fill("+21677000000");
      await page.locator("input[name='password']").fill(initialPassword);
      await page.getByRole("button", { name: "Create user" }).click();
      await expect(
        page.locator("tbody tr").filter({ hasText: userName }),
      ).toBeVisible({ timeout: 10_000 });

      // --- new account is forced through first-login password change ---
      const { context: newUserContext, page: newUserPage } =
        await loginInIsolatedContext(browser, email, initialPassword);
      await expect(newUserPage).toHaveURL(/\/change-password/);
      await newUserContext.close();

      // --- edit profile ---
      await openRowMenu(page, userName);
      await page.getByRole("menuitem", { name: "Edit profile" }).click();
      const renamedTo = `${userName} (edited)`;
      await page.locator("[role=dialog] input[name='name']").fill(renamedTo);
      await clickAndWaitForDialogClose(page, "Save");
      await expect(
        page.locator("tbody tr").filter({ hasText: renamedTo }),
      ).toBeVisible();
      userName = renamedTo;

      // --- change role ---
      await openRowMenu(page, userName);
      await page.getByRole("menuitem", { name: "Change role" }).click();
      await page.locator("[role=dialog]").getByRole("combobox").click();
      await page.getByRole("option", { name: "Analyst" }).click();
      await clickAndWaitForDialogClose(page, "Change role");
      await expect(
        page.locator("tbody tr").filter({ hasText: userName }).getByText("ANALYST"),
      ).toBeVisible();

      // --- reset password, then confirm it forces a change again ---
      await openRowMenu(page, userName);
      await page.getByRole("menuitem", { name: "Reset password" }).click();
      await page.locator("[role=dialog] input[name='newPassword']").fill(resetPassword);
      await clickAndWaitForDialogClose(page, "Reset password");

      const { context: resetContext, page: resetPage } =
        await loginInIsolatedContext(browser, email, resetPassword);
      await expect(resetPage).toHaveURL(/\/change-password/);
      await resetContext.close();
    } finally {
      // --- delete (cleanup, regardless of where the test failed) ---
      await page.goto("/users");
      const row = page.locator("tbody tr").filter({ hasText: suffix });
      if (await row.count()) {
        await openRowMenu(page, suffix);
        await page.getByRole("menuitem", { name: "Delete user" }).click();
        await clickAndWaitForDialogClose(page, "Delete user");
      }
    }

    await page.goto("/users");
    await expect(
      page.locator("tbody tr").filter({ hasText: suffix }),
    ).toHaveCount(0);
  });
});
