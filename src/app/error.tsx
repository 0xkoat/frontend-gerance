"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Error boundaries must be Client Components. Note the prop name: this Next version renamed
// the old `reset` prop to `unstable_retry` (see node_modules/next/dist/docs/01-app/
// 03-api-reference/03-file-conventions/error.md) — `reset()` still exists but the docs now
// recommend `unstable_retry()`, which re-fetches instead of just clearing local state.
//
// Deliberately generic message, no error.message shown: Server Component errors are already
// sanitized to a generic message + digest in production, but Client Component errors forward
// the real message — showing it here would be inconsistent (sometimes detailed, sometimes
// not) and risks leaking internals for the client-thrown case. The digest (when present) is
// enough for a user to reference when reporting it, without exposing what actually failed.
export default function RouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. Try again, or come back later if it
        persists.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      )}
      <Button onClick={() => unstable_retry()}>Try again</Button>
    </div>
  );
}
