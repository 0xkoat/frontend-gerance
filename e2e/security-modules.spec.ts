import { test, expect } from "@playwright/test";
import { clickAndWaitForDialogClose, openRowMenu, selectByKeyboard, uniqueSuffix } from "./helpers";

test.use({ storageState: "e2e/.auth/demo-admin.json" });

test.describe("Security modules", () => {

  test("SIEM: self-assign an open alert, then escalate it", async ({ page }) => {
    await page.goto("/siem");

    // Position-based, not text-based: the demo/mock-poller data seeds many
    // alerts sharing the exact same generic title ("Mock polled detection
    // on polled-host"), so re-querying by title text after a mutation can
    // match more than one row (hit live, a real strict-mode violation).
    // The list's sort order (by creation time) doesn't change from a
    // status/assignee edit, so tracking the row by index is reliable here.
    const allRows = page.locator("tbody tr");
    const rowIndex = await allRows
      .filter({ hasText: "Open" })
      .first()
      .evaluate((el) => Array.from(el.parentElement!.children).indexOf(el));

    const row = allRows.nth(rowIndex);
    await row.locator("button[role=combobox]").click();
    await page.locator("[role=listbox] [role=option]").first().click();
    await expect(row.getByText("Assigned")).toBeVisible({ timeout: 10_000 });

    await row.getByRole("button", { name: "Assigned" }).click();
    await page.getByRole("menuitem", { name: "Escalate" }).click();
    await expect(row.getByText("Escalated")).toBeVisible({ timeout: 10_000 });
  });

  test("VM: change a vulnerability's status through its full lifecycle menu", async ({
    page,
  }) => {
    await page.goto("/vm");
    const row = page.locator("tbody tr").filter({ hasText: "Open" }).first();
    const description = await row.locator("td").nth(1).innerText();

    await row.getByRole("button", { name: "Open" }).click();
    await page.getByRole("menuitem", { name: "Remediated" }).click();

    const updatedRow = page.locator("tbody tr").filter({ hasText: description }).first();
    await expect(updatedRow.getByText("Remediated")).toBeVisible({ timeout: 10_000 });

    // Put it back so this test is repeatable and doesn't permanently drift the demo data.
    await updatedRow.getByRole("button", { name: "Remediated" }).click();
    await page.getByRole("menuitem", { name: "Open", exact: true }).click();
    await expect(updatedRow.getByText("Open", { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("CTI: create an IOC then delete it", async ({ page }) => {
    const suffix = uniqueSuffix();
    const value = `198.51.100.${suffix.slice(-2).padStart(2, "0")}`;

    await page.goto("/cti");
    await page.locator("input[name='value']").fill(value);
    await page.locator("input[name='confidence']").fill("75");
    await page.locator("input[name='source']").fill(`e2e-playwright-${suffix}`);
    await page.getByRole("button", { name: /Create IOC|Add IOC/ }).click();

    const row = page.locator("tbody tr").filter({ hasText: value });
    await expect(row).toBeVisible({ timeout: 10_000 });

    await openRowMenu(page, value);
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await clickAndWaitForDialogClose(page, "Delete");

    await expect(
      page.locator("tbody tr").filter({ hasText: value }),
    ).toHaveCount(0);
  });

  test("SOAR: create a playbook (Admin-only route) then delete it", async ({
    page,
  }) => {
    const suffix = uniqueSuffix();
    const name = `E2E Playwright Playbook ${suffix}`;

    await page.goto("/soar");
    await page.locator("input[name='name']").fill(name);
    await selectByKeyboard(page, page.getByRole("combobox").first(), 3); // LOW -> ... -> CRITICAL
    await page
      .locator("textarea[name='actions']")
      .fill('{"type": "notify", "message": "e2e playwright"}');
    await page.getByRole("button", { name: "Create playbook" }).click();

    const row = page.locator("tbody tr").filter({ hasText: name });
    await expect(row).toBeVisible({ timeout: 10_000 });

    await openRowMenu(page, name);
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await clickAndWaitForDialogClose(page, "Delete");

    await expect(
      page.locator("tbody tr").filter({ hasText: name }),
    ).toHaveCount(0);
  });

  test("DFIR: a real incident detail page shows its linked-record trace", async ({
    page,
  }) => {
    await page.goto("/dfir");
    await page.locator("table tbody tr a").first().click();
    await expect(page).toHaveURL(/\/dfir\/[\w-]+$/);
    await expect(page.getByText("Link an existing record")).toBeVisible();
  });
});
