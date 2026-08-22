// Root-level fallback for cross-app navigation. Doesn't cover every async boundary — e.g.
// (dashboard)/layout.tsx's own GET /users/me fetch runs above this Suspense boundary, not
// inside it (a segment's loading.js wraps its page.js, not a sibling layout.js in the same
// segment) — see Next's loading.js file-conventions doc. Fine as a first pass; per-segment
// loading states are a possible refinement, not done here.
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div
        role="status"
        aria-label="Loading"
        className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
      />
    </div>
  );
}
