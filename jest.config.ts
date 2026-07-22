import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Loads next.config.ts and .env* files (including .env.local's BACKEND_URL, which
  // src/lib/backend.ts requires at import time) into the test environment.
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    // See __mocks__/empty.js for why this mapping exists.
    "^server-only$": "<rootDir>/__mocks__/empty.js",
  },
  // Default (5000ms) is too tight for this environment: running the full suite in parallel
  // workers under WSL2 hits real CPU contention (a file that takes ~2s in isolation can
  // exceed 5s under load), and a test that times out mid-`userEvent.type` can leak
  // keystrokes into the next test's freshly rendered DOM (observed as garbled input
  // values) rather than just failing cleanly. Raising the ceiling avoids that cascade.
  testTimeout: 15000,
};

export default createJestConfig(config);
