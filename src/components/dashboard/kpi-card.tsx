import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number;
  tone?: "default" | "critical" | "warning" | "good";
}

const TONE_TEXT: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-foreground",
  critical: "text-[#d03b3b]",
  warning: "text-[#fab219]",
  good: "text-[#0ca30c]",
};

export function KpiCard({ label, value, tone = "default" }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={cn("text-3xl font-semibold tabular-nums", TONE_TEXT[tone])}
        >
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
