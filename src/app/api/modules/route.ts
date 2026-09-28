import { proxyToBackend } from "@/lib/proxy-route";
import { requireTenantMember } from "@/lib/api-guards";

export const GET = proxyToBackend({
  method: "GET",
  path: "/modules",
  guard: requireTenantMember,
});
