import "server-only";
import { backendFetchAuthed } from "@/lib/backend";
import { requireAuthenticated } from "@/lib/api-guards";

// Proxies the backend's GET /events/stream (a NestJS @Sse endpoint) straight through to the
// browser. Deliberately not built on src/lib/proxy-route.ts's proxyToBackend() — that
// helper always calls .json() on the backend response and wraps the result in
// NextResponse.json(), which would buffer/consume the entire SSE stream (it never ends)
// before ever forwarding a byte to the browser. This route instead forwards the raw
// ReadableStream body untouched — fetch()'s own Response.body already is one — matching the
// "Streaming in Route Handlers" pattern in
// node_modules/next/dist/docs/01-app/02-guides/streaming.md (checked before assuming this
// Next version's Route Handlers support returning a bare `new Response(stream)`, per
// AGENTS.md's standing instruction — confirmed they do, no special API needed).
//
// The browser's native EventSource can't attach an Authorization header — this Route
// Handler is what attaches it server-side, reading the session's own httpOnly access-token
// cookie the same way every other Route Handler does via backendFetchAuthed.
//
// Authorization is checked once, at connect time, by the backend's own guard pipeline
// (NestJS's @Sse endpoints run the normal Guard chain before the Observable is returned,
// not per emitted MessageEvent — see backend/src/events/events.controller.ts). A long-lived
// open connection keeps delivering events past the access token's own 15-minute expiry
// until something forces a reconnect (network blip, tab backgrounding, a Chromium
// throttling policy, etc.), at which point EventSource's native auto-reconnect hits this
// route again and backendFetchAuthed's usual lazy-refresh-on-401 kicks in on the *next*
// connection attempt. This is a property of the backend's guard model, not a frontend gap —
// see CLAUDE.md's adaptation plan, decision 3's Phase 10 revisit note.
export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAuthenticated();
  if (error) return error;

  const backendRes = await backendFetchAuthed("/events/stream", {
    headers: { Accept: "text/event-stream" },
  });

  if (!backendRes.ok || !backendRes.body) {
    return new Response(
      `event: error\ndata: Failed to connect to the event stream\n\n`,
      {
        status: backendRes.status || 502,
        headers: { "Content-Type": "text/event-stream" },
      },
    );
  }

  return new Response(backendRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disables response buffering on proxies that respect it (nginx, some hosting
      // platforms) — irrelevant for local dev but cheap and correct to send regardless.
      "X-Accel-Buffering": "no",
    },
  });
}
