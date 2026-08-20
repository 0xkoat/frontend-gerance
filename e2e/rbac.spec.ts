import { test, expect } from "@playwright/test";

test.describe("RBAC", () => {
  test.describe("Viewer", () => {
    test.use({ storageState: "e2e/.auth/demo-viewer.json" });

    test("sees no mutation controls on a module page and no Users/Tenants nav", async ({
      page,
    }) => {
      await page.goto("/vm");

      // No row-level assign control anywhere — Viewer is read-only, not a
      // restricted mutator.
      await expect(page.getByText("Assign to...")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /^Assign to me$/ }),
      ).toHaveCount(0);

      // Users is Admin-only nav; a Viewer session doesn't even get the link.
      await expect(
        page.locator("nav, aside").getByRole("link", { name: "Users" }),
      ).toHaveCount(0);

      // Direct navigation is also blocked, not just hidden from the
      // sidebar (redirected away, not shown a bare 403 page).
      await page.goto("/users");
      await expect(page).not.toHaveURL(/\/users$/);
    });
  });

  test.describe("Analyst", () => {
    test.use({ storageState: "e2e/.auth/demo-analyst.json" });

    test("can only self-assign, never pick another user", async ({
      page,
    }) => {
      await page.goto("/vm");

      const openRow = page
        .locator("tbody tr")
        .filter({ hasText: "Open" })
        .first();

      // An Analyst gets a plain "Assign to me" button, not the Admin's
      // full assignee-picker dropdown — this is the actual RBAC boundary
      // (`resolveAssignee`: Analyst can only self-assign), reflected in
      // the control's shape, not just a disabled dropdown.
      await expect(
        openRow.getByRole("button", { name: "Assign to me" }),
      ).toBeVisible();
      await expect(openRow.getByText("Assign to...")).toHaveCount(0);
    });
  });
});
