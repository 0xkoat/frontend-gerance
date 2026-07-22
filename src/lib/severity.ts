import type { Severity } from "@/lib/mock-data";

// Reserved status palette (not a categorical/cycled hue set) — mapped from the dataviz
// skill's fixed good/warning/serious/critical steps, validated for contrast against both
// light and dark chart surfaces. Severity is an ordered state, exactly what that palette
// is for; picking ad-hoc reds/oranges here would've needed its own CVD validation pass.
export const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#0ca30c",
  medium: "#fab219",
  high: "#ec835a",
  critical: "#d03b3b",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];
