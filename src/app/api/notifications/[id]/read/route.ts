import { proxyToBackend } from "@/lib/proxy-route";

export const PATCH = proxyToBackend({
  method: "PATCH",
  path: (params) => `/notifications/${params.id}/read`,
  fallbackErrorMessage: "Could not mark the notification as read",
});
