import type { SessionClaims } from "@/types/auth";

// Pure, no "server-only" — used both in src/lib/session.ts (Node runtime) and
// src/proxy.ts (Proxy/Edge runtime), which can't import next/headers' cookies().
// No signature verification (see src/lib/session.ts for why that's an intentional
// choice, not an oversight): this only decodes, so treat its output as optimistic.
export function decodeJwtPayload(token: string): SessionClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64url = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64url);
    const payload = JSON.parse(json) as {
      sub: string;
      role: SessionClaims["role"];
      tenantId: string | null;
      mustChangePassword: boolean;
      exp?: number;
    };

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return {
      userId: payload.sub,
      role: payload.role,
      tenantId: payload.tenantId,
      mustChangePassword: payload.mustChangePassword,
    };
  } catch {
    return null;
  }
}
