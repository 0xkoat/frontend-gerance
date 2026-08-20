import { test as setup } from "@playwright/test";
import { login } from "./helpers";
import {
  SUPER_ADMIN,
  DEMO_ADMIN,
  DEMO_ANALYST,
  DEMO_VIEWER,
} from "./fixtures/accounts";

// `POST /auth/login` shares a 5-requests-per-60s-per-IP budget across the
// whole auth controller (login/refresh/logout/forgot-password — see
// `helpers.ts`'s `paceAuthCall()` doc comment for the full detail,
// including why a naive per-file delay isn't enough: tripping the block
// once stalls every auth call for a full 60s, confirmed live). `login()`
// already paces itself globally, so these 4 just call it back to back —
// no manual delay needed here.
//
// Logging in once per role here and reusing the resulting session cookies
// (Playwright's `storageState`) is both the idiomatic Playwright pattern
// for this and the only way to stay under that budget once there's more
// than a handful of tests. Specs that need a genuinely fresh UI login
// (proving the forced-first-login-password-change redirect for a brand
// new account) still do a real `login()` call — there are only a couple of
// those, and they're paced the same way.
setup("authenticate as super admin", async ({ page }) => {
  await login(page, SUPER_ADMIN.email, SUPER_ADMIN.password);
  await page.context().storageState({ path: "e2e/.auth/super-admin.json" });
});

setup("authenticate as demo admin", async ({ page }) => {
  await login(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.context().storageState({ path: "e2e/.auth/demo-admin.json" });
});

setup("authenticate as demo analyst", async ({ page }) => {
  await login(page, DEMO_ANALYST.email, DEMO_ANALYST.password);
  await page.context().storageState({ path: "e2e/.auth/demo-analyst.json" });
});

setup("authenticate as demo viewer", async ({ page }) => {
  await login(page, DEMO_VIEWER.email, DEMO_VIEWER.password);
  await page.context().storageState({ path: "e2e/.auth/demo-viewer.json" });
});
