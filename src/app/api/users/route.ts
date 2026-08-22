import { proxyToBackend } from "@/lib/proxy-route";
import { requireAdmin } from "@/lib/api-guards";
import { createUserSchema } from "@/lib/validations/users";

// Converted to proxyToBackend() to close a SonarCloud duplication finding — this and
// tenants/route.ts, users/[id]/role/route.ts, users/[id]/reset-password/route.ts, and
// users/me/request-password-change/route.ts all repeated the same validate → guard →
// backendFetchAuthed → normalize-error shape by hand, predating the shared factory (added
// in Phase 2 for the six security modules) and never migrated onto it until now. GET has no
// filters of its own to whitelist — page/pageSize are the only two query params the
// frontend ever sends, and proxyToBackend()'s GET path already forwards whatever query
// string is present as-is.
export const GET = proxyToBackend({
  method: "GET",
  path: "/users",
  guard: requireAdmin,
});

export const POST = proxyToBackend({
  method: "POST",
  path: "/users",
  schema: createUserSchema,
  guard: requireAdmin,
  fallbackErrorMessage: "Could not create user",
});
