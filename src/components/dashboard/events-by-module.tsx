import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleName } from "@/types/security";
import type { AssetFeedEntry } from "@/types/assets";

// Replaces the old mock "Top attack sources" panel (removed 2026-08-07, Phase 9) — no
// module's schema stores a structured attacker-source-IP field consistently enough to
// aggregate one (SiemLog.source is a free-text log-source name, not an attacker IP;
// EdrEndpoint.ip is the endpoint's own address; everything else keeps IP-shaped data, if
// any, inside opaque `rawData` JSON). Rather than drop the second panel entirely, this
// shows a real breakdown this data genuinely supports: event volume by source module, from
// the same feed page SeverityBreakdown already renders.
const BAR_COLOR = "#256abf";

export function EventsByModule({ entries }: { entries: AssetFeedEntry[] }) {
  const byModule = Object.fromEntries(
    Object.values(ModuleName).map((m) => [m, 0]),
  ) as Record<ModuleName, number>;
  for (const entry of entries) {
    byModule[entry.source] += 1;
  }
  const rows = Object.values(ModuleName)
    .map((m) => ({ module: m, count: byModule[m] }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Events by module — most recent events
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.module} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-sm text-muted-foreground">
                {r.module}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(r.count / max) * 100}%`,
                    backgroundColor: BAR_COLOR,
                  }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm tabular-nums font-medium">
                {r.count}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
