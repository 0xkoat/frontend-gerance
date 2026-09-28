import { test, expect, type Page } from "@playwright/test";

// Users is Admin-only nav and Tenants is Super-Admin-only nav; a non-Admin
// tenant session gets neither link, and direct navigation is also blocked
// (redirected away, not shown a bare 403 page).
async function expectNoAdminNav(page: Page) {
  await page.goto("/dashboard");

  const nav = page.locator("nav, aside");
  await expect(nav.getByRole("link", { name: "Users" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Tenants" })).toHaveCount(0);

  await page.goto("/users");
  await expect(page).not.toHaveURL(/\/users$/);
}

test.describe("RBAC", () => {
  test.describe("Viewer", () => {
    test.use({ storageState: "e2e/.auth/demo-viewer.json" });

    test("gets no Users/Tenants nav and cannot reach /users", async ({
      page,
    }) => {
      await expectNoAdminNav(page);
    });
  });

  test.describe("Analyst", () => {
    test.use({ storageState: "e2e/.auth/demo-analyst.json" });

    test("gets no Users/Tenants nav and cannot reach /users", async ({
      page,
    }) => {
      await expectNoAdminNav(page);
    });
  });
});
