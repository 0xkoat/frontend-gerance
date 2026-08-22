import { proxyToBackend } from "@/lib/proxy-route";
import { requireAuthenticated } from "@/lib/api-guards";

// Converted to proxyToBackend() — see users/route.ts's own comment for the full reasoning.
// No body to validate (no schema), open to any authenticated tenant role — the backend
// resolves the actual recipient (first-created Admin, or Super Admins if that Admin is the
// one requesting) itself, this route just relays the request.
export const POST = proxyToBackend({
  method: "POST",
  path: "/users/me/request-password-change",
  guard: requireAuthenticated,
  fallbackErrorMessage: "Could not send the request",
});
