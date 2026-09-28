import { test, expect, type Page } from "@playwright/test";

// v2 Phase 3 against the real stack. CTI is pointed at this frontend's own login page on
// 127.0.0.1 — a real, reachable HTTP listener standing in for a module on the internal
// network (a different origin from localhost, so the "module" page loads logged out).
const CTI_TARGET = "http://127.0.0.1:3001/login";

async function configureCti(page: Page) {
  await page.goto("/module-endpoints");
  // Match the module cell exactly: a plain hasText "CTI" also matches
  // "Test conne-cti-on" in every row (case-insensitive substring).
  const row = page
    .locator("tbody tr")
    .filter({ has: page.getByRole("cell", { name: "CTI", exact: true }) });
  await row.getByRole("button", { name: "Edit" }).click();

  const dialog = page.locator("[role=dialog]");
  await dialog.getByLabel("Protocol").click();
  await page.getByRole("option", { name: "HTTP", exact: true }).click();
  await dialog.getByLabel(/host/i).fill("127.0.0.1");
  await dialog.getByLabel(/^port$/i).fill("3001");
  await dialog.getByLabel(/^path$/i).fill("/login");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 8_000 });

  await expect(row.getByText(CTI_TARGET)).toBeVisible();
  return row;
}

test.describe("Modules", () => {
  test.describe("Integration Admin", () => {
    test.use({ storageState: "e2e/.auth/demo-integration-admin.json" });

    test("sets an endpoint and tests the connection", async ({ page }) => {
      const row = await configureCti(page);

      await row.getByRole("button", { name: "Test connection" }).click();
      await expect(page.getByText("CTI is reachable")).toBeVisible();
    });
  });

  test.describe("L1 Analyst", () => {
    test.use({ storageState: "e2e/.auth/demo-analyst.json" });

    test("sees only level-allowed modules and is redirected to the module", async ({
      page,
      browser,
    }) => {
      // Make sure CTI has a target regardless of test order.
      const iaContext = await browser.newContext({
        storageState: "e2e/.auth/demo-integration-admin.json",
      });
      await configureCti(await iaContext.newPage());
      await iaContext.close();

      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { name: "Security modules" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Open CTI" }),
      ).toBeVisible();
      // SIEM (L2 by default) and the L3 modules are not offered to an L1 Analyst at all.
      for (const hidden of ["SIEM", "EDR", "SOAR", "DFIR"]) {
        await expect(page.getByText(hidden, { exact: true })).toHaveCount(0);
      }

      await page.getByRole("button", { name: "Open CTI" }).click();
      await page.waitForURL(CTI_TARGET);
    });
  });

  test.describe("Tenant Admin", () => {
    test.use({ storageState: "e2e/.auth/demo-admin.json" });

    test("lowers a module's level, which the Analyst then sees", async ({
      page,
      browser,
    }) => {
      await page.goto("/module-access");
      const siemLevel = page.getByLabel("Minimum analyst level for SIEM");

      try {
        await siemLevel.click();
        await page.getByRole("option", { name: "L1", exact: true }).click();
        await expect(
          page.getByText("SIEM now requires L1 or higher"),
        ).toBeVisible();

        const analystContext = await browser.newContext({
          storageState: "e2e/.auth/demo-analyst.json",
        });
        const analystPage = await analystContext.newPage();
        await analystPage.goto("/dashboard");
        await expect(
          analystPage.getByRole("button", { name: "Open SIEM" }),
        ).toBeVisible();
        await analystContext.close();
      } finally {
        // Restore the default so other runs start from the seeded state.
        await page.goto("/module-access");
        await page.getByLabel("Minimum analyst level for SIEM").click();
        await page.getByRole("option", { name: "L2", exact: true }).click();
        await expect(
          page.getByText("SIEM now requires L2 or higher"),
        ).toBeVisible();
      }
    });
  });
});
