// Maps the "server-only" import to a no-op in tests (see jest.config.ts's moduleNameMapper).
// The real "server-only" package unconditionally throws on import — Next's actual build
// strips it from the server compilation graph so it never executes there, but Jest has no
// such special-casing, so importing it directly in a test would throw immediately. This is
// the workaround documented in Next's own Jest guide (node_modules/next/dist/docs/01-app/
// 02-guides/testing/jest.md, "Disable server-only").
module.exports = {};
