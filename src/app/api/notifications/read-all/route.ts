import { proxyToBackend } from "@/lib/proxy-route";

export const POST = proxyToBackend({
  method: "POST",
  path: "/notifications/read-all",
  fallbackErrorMessage: "Could not mark notifications as read",
});
