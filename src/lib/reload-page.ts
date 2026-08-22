// Thin wrapper around window.location.reload() so components that need a guaranteed-fresh
// page (see assignment-control.tsx's own comment for why a hard reload replaced
// router.refresh() there) can be tested via a normal jest.mock() of this module, instead of
// fighting jsdom's window.location — its `reload` property is deliberately non-configurable
// in this jsdom version (by design, to catch accidental real-navigation attempts in tests),
// so Object.defineProperty-based mocking of it throws no matter how it's attempted (found
// live, 2026-08-22).
export function reloadPage(): void {
  window.location.reload();
}
