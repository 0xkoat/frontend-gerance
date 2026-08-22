// Credentials for the two seed scripts this suite depends on — see
// playwright.config.ts's precondition comment. Not secrets: both are local
// dev bootstrap data already committed in plaintext (`backend/prisma/
// seed-data.json` for the Super Admin, `backend/prisma/seed-modules.ts` for
// the demo tenants — that script prints the shared password to the console
// on every run, by design, so it's meant to be known and reused like this).

export const SUPER_ADMIN = {
  email: "youssef@secops.local",
  password: "2He49_XgG=q^",
};

// One of the five demo tenants seed-modules.ts creates. `seed-modules.ts`
// calls `faker.seed(20260819)` at the top of `main()` (added 2026-08-19,
// specifically so this fixture file could hardcode real identities instead
// of scraping them from the UI at runtime) — that makes tenant/person names
// reproducible across reseeds, in generation order, even though every
// module record's own content (severities, counts, assign/status) still
// varies per run via plain `Math.random()`. This is the FIRST tenant
// `seed-modules.ts` creates; re-verify these values with a fresh
// `npm run seed:demo` run if the seed constant or generation order ever
// changes.
export const DEMO_TENANT_NAME = "Crooks and Sons relationships";
export const DEMO_PASSWORD = "DemoPassw0rd!2026";

export const DEMO_ADMIN = {
  email: "katheryn.zemlak58@crooks-and-sons-rela.demo",
  password: DEMO_PASSWORD,
};
export const DEMO_CO_ADMIN = {
  email: "francesco_streich@crooks-and-sons-rela.demo",
  password: DEMO_PASSWORD,
};
export const DEMO_ANALYST = {
  email: "laverne.johnson75@crooks-and-sons-rela.demo",
  password: DEMO_PASSWORD,
};
export const DEMO_VIEWER = {
  email: "joey.effertz@crooks-and-sons-rela.demo",
  password: DEMO_PASSWORD,
};
