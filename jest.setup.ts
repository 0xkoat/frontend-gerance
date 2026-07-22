import "@testing-library/jest-dom";

// Next's env loading skips .env.local when NODE_ENV=test (by design, so dev secrets don't
// leak into test runs) — see the precedence rules in Next's environment-variables guide.
// src/lib/backend.ts requires BACKEND_URL at import time; tests never make a real network
// call to it (routes are tested with fetch mocked), so a fixed placeholder is enough.
process.env.BACKEND_URL ??= "http://localhost:3000/api";
