import { test, expect } from "@playwright/test";
import { uniqueSuffix } from "./helpers";

// v2 Phase 4 against the real stack: an Analyst raises a Modules ticket, the Integration
// Admin (already on the dashboard) gets it live in the bell without reloading, moves it to
// In progress, and the Analyst is notified of the change.
test.describe("Tickets", () => {
  test("module ticket flows from Analyst to Integration Admin and back, live", async ({
    browser,
  }) => {
    const title = `E2E SIEM ticket ${uniqueSuffix()}`;

    const iaContext = await browser.newContext({
      storageState: "e2e/.auth/demo-integration-admin.json",
    });
    const analystContext = await browser.newContext({
      storageState: "e2e/.auth/demo-analyst.json",
    });
    const iaPage = await iaContext.newPage();
    const analystPage = await analystContext.newPage();

    try {
      await iaPage.goto("/dashboard");
      const iaBell = iaPage.getByRole("button", { name: /^Notifications/ });
      await expect(iaBell).toBeVisible();

      // --- the Analyst raises a Modules ticket about SIEM ---
      await analystPage.goto("/tickets");
      await analystPage.getByLabel("Title").fill(title);
      await analystPage.getByLabel("Module").click();
      await analystPage
        .getByRole("option", { name: "SIEM", exact: true })
        .click();
      await analystPage
        .getByLabel("Description")
        .fill("The SIEM login page never finishes loading from the office.");
      await analystPage.getByRole("button", { name: "Send ticket" }).click();
      await expect(analystPage.getByText("Ticket sent")).toBeVisible();
      const analystRow = analystPage
        .locator("tbody tr")
        .filter({ hasText: title });
      await expect(analystRow.getByText("Open", { exact: true })).toBeVisible();

      // --- it reaches the Integration Admin live, without a reload ---
      await expect(iaPage.getByText(`New ticket: ${title}`)).toBeVisible({
        timeout: 15_000,
      });
      await expect(iaBell).toHaveAccessibleName(/unread/);

      // --- the Integration Admin opens it from the bell and starts on it ---
      await iaBell.click();
      await iaPage
        .getByRole("menuitem", { name: `New ticket: ${title}` })
        .click();
      await iaPage.waitForURL(/\/tickets$/);
      const iaRow = iaPage.locator("tbody tr").filter({ hasText: title });
      await iaRow
        .getByRole("button", { name: `Change status of ${title}` })
        .click();
      await iaPage
        .getByRole("menuitem", { name: "Start working on it" })
        .click();
      await expect(iaRow.getByText("In progress")).toBeVisible();

      // --- the Analyst is told, and sees the new status ---
      await expect(
        analystPage.getByText(`"${title}" is now In progress`),
      ).toBeVisible({ timeout: 15_000 });
      await analystPage.goto("/tickets");
      await expect(
        analystPage
          .locator("tbody tr")
          .filter({ hasText: title })
          .getByText("In progress"),
      ).toBeVisible();

      // --- the Analyst can only withdraw their own ticket ---
      await analystPage
        .locator("tbody tr")
        .filter({ hasText: title })
        .getByRole("button", { name: `Change status of ${title}` })
        .click();
      await expect(analystPage.getByRole("menuitem")).toHaveText([
        "Mark resolved",
      ]);
      await analystPage
        .getByRole("menuitem", { name: "Mark resolved" })
        .click();
      await expect(
        analystPage
          .locator("tbody tr")
          .filter({ hasText: title })
          .getByText("Resolved"),
      ).toBeVisible();
    } finally {
      await iaContext.close();
      await analystContext.close();
    }
  });
});
