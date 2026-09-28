import { proxyToBackend } from "@/lib/proxy-route";
import { requireSuperAdmin } from "@/lib/api-guards";
import { resetPasswordSchema } from "@/lib/validations/users";

export const POST = proxyToBackend({
  method: "POST",
  path: (params) => `/integration-admins/${params.id}/reset-password`,
  schema: resetPasswordSchema,
  guard: requireSuperAdmin,
  fallbackErrorMessage: "Could not reset password",
});
