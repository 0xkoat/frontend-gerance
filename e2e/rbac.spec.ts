import { test, expect, type Page } from "@playwright/test";

// Admin-only (Users) and Super-Admin-only (Tenants, Integration Admins) nav links are
// absent for every other role, and direct navigation is also blocked (redirected away,
// not shown a bare 403 page).
async function expectNoAdminNav(page: Page) {
  await page.goto("/dashboard");

  const nav = page.locator("nav, aside");
  for (const name of ["Users", "Tenants", "Integration Admins"]) {
    await expect(nav.getByRole("link", { name })).toHaveCount(0);
  }

  for (const path of ["/users", "/tenants", "/integration-admins"]) {
    await page.goto(path);
    await expect(page).not.toHaveURL(new RegExp(`${path}$`));
  }
}

test.describe("RBAC", () => {
  test.describe("Analyst", () => {
    test.use({ storageState: "e2e/.auth/demo-analyst.json" });

    test("gets no admin nav, cannot reach admin pages, and sees its level", async ({
      page,
    }) => {
      await expectNoAdminNav(page);
      await expect(
        page.locator("aside").getByText(/Analyst · L1/),
      ).toBeVisible();
    });
  });

  test.describe("Integration Admin", () => {
    test.use({ storageState: "e2e/.auth/demo-integration-admin.json" });

    test("is platform-wide with no tenant or user management", async ({
      page,
    }) => {
      await expectNoAdminNav(page);
      await expect(
        page.locator("aside").getByText("Integration Admin"),
      ).toBeVisible();
    });
  });
});
