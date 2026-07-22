import { redirect } from "next/navigation";

// src/proxy.ts already redirects unauthenticated visitors to /login before this ever
// renders, so an authenticated visitor landing on "/" only has one place left to go.
export default function RootPage() {
  redirect("/dashboard");
}
