"use client";

import "./globals.css";

// Only fires for errors in the root layout itself (very rare — see error.tsx for the normal
// per-route case). Must define its own <html>/<body> and can't use `metadata`/
// `generateMetadata` exports (Client Component restriction) — this replaces the root layout
// entirely when active, so it can't rely on anything RootLayout normally provides.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground antialiased">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            The application failed to load. Try again, or come back later if it
            persists.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground">
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={() => unstable_retry()}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
