// Full-page navigation to another origin (a module's private IP:PORT). Wrapped so
// components that use it can be tested with jest.mock() — jsdom's window.location is not
// configurable, so it can't be stubbed directly.
export function navigateTo(url: string): void {
  window.location.assign(url);
}
