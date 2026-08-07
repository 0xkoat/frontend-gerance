import type { Severity } from "@/types/security";

// Reserved status palette (not a categorical/cycled hue set) — mapped from the dataviz
// skill's fixed good/warning/serious/critical steps, validated for contrast against both
// light and dark chart surfaces. Severity is an ordered state, exactly what that palette
// is for; picking ad-hoc reds/oranges here would've needed its own CVD validation pass.
//
// Keyed by the real backend Severity enum (uppercase) since 2026-08-07's Phase 2 pass — was
// keyed by the now-deleted src/lib/mock-data.ts's lowercase mock type before that. Phase 9
// (2026-08-07) replaced every remaining mock-data.ts consumer (the dashboard's alerts table,
// severity breakdown, KPIs, and "top attack sources") with real GET /assets/feed data — see
// CLAUDE.md's adaptation plan, decision 5, and Phase 9's own checklist.
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
