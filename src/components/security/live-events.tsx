"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  classifyLiveEvent,
  describeCreatedEvent,
  severityOf,
} from "@/lib/live-events";

const REFRESH_DEBOUNCE_MS = 500;

// Mounted once per page that wants live updates — currently the dashboard
// ((dashboard)/dashboard's TenantOverview) and (dashboard)/assets only, per the Phase 10
// plan's own decision not to wire this into every module list page in the same pass. Opens
// one EventSource to the streaming proxy (src/app/api/events/stream/route.ts) and reacts to
// every frame:
//
// - a new critical-severity *.created event gets a sonner toast
// - every classifiable frame (created/assigned/status-or-unassigned/deleted) triggers a
//   debounced router.refresh() — this re-runs the current route's Server Component against
//   real backend data instead of hand-patching client state. Deliberate simplification:
//   patching individual rows in place would need every table this mounts alongside
//   (FeedTable today, potentially the six module tables later) to hold client-side state
//   mirroring what's currently a plain server-rendered prop — a much larger refactor for a
//   marginal smoothness gain over "the list updates within half a second, using real data
//   every time, not a synthetic guess with no real id." Revisit only if router.refresh()'s
//   full-tree re-render becomes a measured cost problem, not preemptively.
//
// Renders nothing — a bare effect component.
export function LiveEvents() {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/events/stream", {
      withCredentials: true,
    });

    function scheduleRefresh() {
      if (refreshTimer.current) return;
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    }

    source.onmessage = (event: MessageEvent<string>) => {
      let raw: unknown;
      try {
        raw = JSON.parse(event.data);
      } catch {
        return;
      }
      if (typeof raw !== "object" || raw === null) return;

      const kind = classifyLiveEvent(raw);
      if (kind === "unknown") return;

      if (kind === "created") {
        const record = raw as Record<string, unknown>;
        if (severityOf(record) === "CRITICAL") {
          toast.error(describeCreatedEvent(record), {
            description: "New critical event",
          });
        }
      }

      scheduleRefresh();
    };

    // EventSource reconnects natively on a network-level error (its default browser
    // behavior, with backoff) — no manual reconnect logic needed here.

    return () => {
      source.close();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [router]);

  return null;
}
