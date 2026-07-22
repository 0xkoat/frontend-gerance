import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockTopAttackSources } from "@/lib/mock-data";

// Sequential single hue (magnitude, one series) per the dataviz skill's default blue ramp,
// step 500 — a flat ranked list, not a heatmap, so one consistent shade + bar length
// carries the value rather than shading each bar differently.
const BAR_COLOR = "#256abf";

export function TopAttackSources() {
  const max = Math.max(...mockTopAttackSources.map((s) => s.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Top attack sources — by alert volume, last 24h
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {mockTopAttackSources.map((s) => (
          <div key={s.ip} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-sm tabular-nums text-muted-foreground">
              {s.ip}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(s.count / max) * 100}%`,
                  backgroundColor: BAR_COLOR,
                }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm tabular-nums font-medium">
              {s.count}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
