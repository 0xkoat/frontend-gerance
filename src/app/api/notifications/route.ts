import { proxyToBackend } from "@/lib/proxy-route";

// Any authenticated user; the backend only ever returns the caller's own.
export const GET = proxyToBackend({ method: "GET", path: "/notifications" });
