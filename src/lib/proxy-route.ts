import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import {
  backendFetchAuthed,
  firstErrorMessage,
  type BackendErrorBody,
} from "@/lib/backend";
import { requireAuthenticated } from "@/lib/api-guards";
import type { SessionClaims } from "@/types/auth";

type RouteParams = Record<string, string>;

type Guard = () => Promise<
  | { error: NextResponse; session: null }
  | { error: null; session: SessionClaims }
>;

interface ProxyToBackendOptions<Body> {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  // The backend path this route proxies to, e.g. "/vm/assets". For a route with a dynamic
  // segment (this Route Handler's own [id] folder), pass a function instead —
  // `(params) => \`/vm/vulnerabilities/${params.id}/status\`` — params come from Next's own
  // context.params for that segment.
  path: string | ((params: RouteParams) => string);
  // Validated against the request body before forwarding. Omit for GET/DELETE routes, which
  // never send one.
  schema?: z.ZodType<Body>;
  // Defaults to requireAuthenticated (any authenticated tenant role) — matches the backend's
  // own default of "no @Roles() at all" on most GET routes (see backend/CLAUDE.md's module
  // plan, decision 9: Viewer is read-only, not blocked). Pass requireAnalystOrAdmin or
  // requireAdmin from src/lib/api-guards.ts for mutation routes.
  guard?: Guard;
  fallbackErrorMessage?: string;
}

// Shared factory behind every Route Handler under src/app/api/{vm,edr,siem,cti,soar,dfir,
// assets}/**, per decision 6 in CLAUDE.md's adaptation plan: one small helper parameterized
// by path/method/schema/guard, instead of ~40 hand-written near-duplicates each repeating
// the same zod-validate → guard → backendFetchAuthed → normalize-error shape (the pattern
// src/app/api/users/route.ts and friends already established by hand). Proven first against
// VM's asset list/create routes (the simplest shape, no dynamic segment) — see
// src/app/api/vm/assets/route.ts — before generating the other ~35.
//
// Always uses the refresh-capable backendFetchAuthed, never backendFetchAuthedNoRefresh —
// every caller of this helper is a Route Handler by construction (it's exported as a
// GET/POST/PATCH/DELETE from a route.ts file), never a Server Component. See
// src/lib/backend.ts's doc comments for why that distinction matters.
export function proxyToBackend<Body = undefined>(
  options: ProxyToBackendOptions<Body>,
) {
  return async function handler(
    request: Request,
    context?: { params: Promise<RouteParams> },
  ): Promise<Response> {
    const guard = options.guard ?? requireAuthenticated;
    const { error } = await guard();
    if (error) return error;

    const params = context ? await context.params : {};
    const backendPath =
      typeof options.path === "function" ? options.path(params) : options.path;

    let body: string | undefined;
    if (options.schema) {
      const raw = await request.json().catch(() => null);
      const parsed = options.schema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { message: parsed.error.issues[0]?.message ?? "Invalid input" },
          { status: 400 },
        );
      }
      body = JSON.stringify(parsed.data);
    }

    const searchParams = new URL(request.url).searchParams.toString();
    const query =
      options.method === "GET" && searchParams ? `?${searchParams}` : "";

    const backendRes = await backendFetchAuthed(`${backendPath}${query}`, {
      method: options.method,
      ...(body !== undefined ? { body } : {}),
    });

    if (!backendRes.ok) {
      const errorBody = (await backendRes
        .json()
        .catch(() => null)) as BackendErrorBody | null;
      const fallback = options.fallbackErrorMessage ?? "Request failed";
      return NextResponse.json(
        {
          message: errorBody
            ? firstErrorMessage(errorBody, fallback)
            : fallback,
        },
        { status: backendRes.status },
      );
    }

    // DELETE routes (and any 2xx with no body) leave nothing to parse — .catch(() => null)
    // covers that instead of throwing on an empty response.
    const responseBody = await backendRes.json().catch(() => null);
    return NextResponse.json(responseBody ?? {}, { status: backendRes.status });
  };
}
