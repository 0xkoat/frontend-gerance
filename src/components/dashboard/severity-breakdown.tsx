import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockSeverityBreakdown } from "@/lib/mock-data";
import { SEVERITY_COLOR, SEVERITY_LABEL, SEVERITY_ORDER } from "@/lib/severity";

// Stacked bar + legend, not a donut: with counts this close together (57-94), angle is a
// hard channel to compare precisely — length (even squeezed into one stacked bar) reads
// better, and a legend/value pairing avoids relying on color-matching alone.
// See node_modules-adjacent dataviz skill notes on why bar > pie for exact comparison.
export function SeverityBreakdown() {
  const total = mockSeverityBreakdown.reduce((sum, s) => sum + s.count, 0);
  const bySeverity = Object.fromEntries(
    mockSeverityBreakdown.map((s) => [s.severity, s.count]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Alerts by severity — last 24h
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-3xl font-semibold tabular-nums">
          {total.toLocaleString()}
        </p>

        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label="Alerts by severity"
        >
          {SEVERITY_ORDER.map((severity, i) => {
            const count = bySeverity[severity] ?? 0;
            const pct = (count / total) * 100;
            return (
              <div
                key={severity}
                className={i > 0 ? "ml-[2px]" : undefined}
                style={{
                  width: `${pct}%`,
                  backgroundColor: SEVERITY_COLOR[severity],
                }}
                title={`${SEVERITY_LABEL[severity]}: ${count}`}
              />
            );
          })}
        </div>

        <ul className="flex flex-col gap-1.5">
          {SEVERITY_ORDER.map((severity) => (
            <li
              key={severity}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLOR[severity] }}
                  aria-hidden
                />
                {SEVERITY_LABEL[severity]}
              </span>
              <span className="tabular-nums font-medium">
                {bySeverity[severity] ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
