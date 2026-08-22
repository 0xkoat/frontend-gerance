import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Already in .gitignore, but flat-config ESLint doesn't read .gitignore on its own —
    // Playwright's own HTML report + trace-viewer bundles (vendored, minified third-party
    // code like CodeMirror) get scanned as if they were real source otherwise, found live
    // after running `npm run test:e2e` locally left one behind.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
