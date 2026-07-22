import Link from "next/link";
import { Button } from "@/components/ui/button";

// Root app/not-found.tsx handles both notFound() calls anywhere in the tree and any
// unmatched URL for the whole app (see Next's file-conventions/not-found.md). Runs inside
// the normal root layout (dark theme, fonts already applied), unlike global-error.tsx which
// has to bring its own <html>/<body>.
//
// Deliberately does NOT call getSession() to pick between "/dashboard" and "/login" — that
// would force this segment (and, since the root not-found applies app-wide, effectively the
// whole app shell) into dynamic rendering, de-optimizing otherwise-static pages like /login
// and /forgot-password purely for a nicer link label on a 404 page. Linking to "/" instead
// gets the same correct destination for free: src/app/page.tsx already redirects to
// /dashboard when authenticated, and src/proxy.ts already redirects to /login otherwise.
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Button render={<Link href="/" />}>Back home</Button>
    </div>
  );
}
