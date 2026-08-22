import { test, expect } from "@playwright/test";
import { clickAndWaitForDialogClose, loginInIsolatedContext, uniqueSuffix } from "./helpers";

test.use({ storageState: "e2e/.auth/super-admin.json" });

test.describe("Tenants (Super Admin)", () => {
  test("create a tenant with its first Admin, confirm the Admin is forced through first-login, then rename and delete it", async ({
    page,
    browser,
  }) => {
    const suffix = uniqueSuffix();
    const tenantName = `E2E Playwright Org ${suffix}`;
    const adminEmail = `e2e-playwright-${suffix}@example.com`;
    const adminPassword = "E2ePlaywrightPassw0rd!";

    await page.goto("/tenants");

    await page.locator("input[name='tenantName']").fill(tenantName);
    await page.locator("input[name='name']").fill("E2E Playwright Admin");
    await page.locator("input[name='email']").fill(adminEmail);
    await page.locator("input[name='phoneNumber']").fill("+21699000000");
    await page.locator("input[name='password']").fill(adminPassword);
    await page.getByRole("button", { name: "Create tenant" }).click();

    const tenantRow = page.locator("tbody tr").filter({ hasText: tenantName });
    await expect(tenantRow).toBeVisible({ timeout: 10_000 });

    try {
      // The one hard provisioning rule this whole app is built around:
      // every new user, at every level, is forced through a first-login
      // password change. Prove it end to end, not just that the row exists.
      const { context: adminContext, page: adminPage } =
        await loginInIsolatedContext(browser, adminEmail, adminPassword);
      await expect(adminPage).toHaveURL(/\/change-password/);
      await adminContext.close();

      // Rename (lives on the tenant list, not the detail page).
      await page
        .getByRole("button", { name: `Rename ${tenantName}` })
        .click();
      const renamedName = `${tenantName} (renamed)`;
      await page.locator("[role=dialog] input").fill(renamedName);
      await clickAndWaitForDialogClose(page, "Save");
      await expect(
        page.locator("tbody tr").filter({ hasText: renamedName }),
      ).toBeVisible();
    } finally {
      // Clean up regardless of which assertion above failed, so a failed
      // run doesn't leave permanent test debris in the demo dataset.
      await page.goto("/tenants");
      const currentLink = page
        .locator("tbody tr a")
        .filter({ hasText: suffix });
      if (await currentLink.count()) {
        const currentName = await currentLink.first().innerText();
        await page
          .getByRole("button", { name: `Delete ${currentName}` })
          .click();
        await clickAndWaitForDialogClose(page, "Delete tenant");
      }
    }

    await expect(
      page.locator("tbody tr").filter({ hasText: suffix }),
    ).toHaveCount(0);
  });

  test("tenant detail shows its admins and configured modules", async ({
    page,
  }) => {
    await page.goto("/tenants");

    const firstTenantLink = page.locator("table tbody tr a").first();
    await firstTenantLink.click();

    await expect(page.getByText(/Admins?$/)).toBeVisible();
    await expect(page.getByText(/modules configured/)).toBeVisible();
  });
});
