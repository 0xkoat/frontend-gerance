import type { Severity } from "@/types/security";

// Reserved status palette (not a categorical/cycled hue set) — mapped from the dataviz
// skill's fixed good/warning/serious/critical steps, validated for contrast against both
// light and dark chart surfaces. Severity is an ordered state, exactly what that palette
// is for; picking ad-hoc reds/oranges here would've needed its own CVD validation pass.
//
// Keyed by the real backend Severity enum (uppercase) since 2026-08-07's Phase 2 pass —
// was keyed by src/lib/mock-data.ts's lowercase mock type before that. mock-data.ts's own
// Severity values were uppercased to match at the same time so its two remaining consumers
// (AlertsTable, SeverityBreakdown) keep compiling until Phase 9 replaces them with real data
// — see CLAUDE.md's adaptation plan, decision 5.
export const SEVERITY_COLOR: Record<Severity, string> = {
  LOW: "#0ca30c",
  MEDIUM: "#fab219",
  HIGH: "#ec835a",
  CRITICAL: "#d03b3b",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
