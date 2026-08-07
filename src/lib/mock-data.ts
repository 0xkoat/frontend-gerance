// Placeholder data for the Security Overview dashboard. As of 2026-08-06 the SIEM module
// (and all five others) are fully built on the backend — this file just hasn't been swapped
// out yet, see CLAUDE.md's Phase 9 ("asset feed and dashboard integration") for the real
// replacement plan. Severity now imports the real backend enum (uppercase) rather than
// duplicating a mock lowercase one — see src/lib/severity.ts's comment and CLAUDE.md's
// adaptation plan, decision 5, for why that changed 2026-08-07 even though this file's own
// data is still fake.

import type { Severity } from "@/types/security";

export type { Severity };
export type AlertStatus = "open" | "assigned" | "escalated" | "resolved";

export interface MockAlert {
  id: string;
  title: string;
  severity: Severity;
  source: string;
  destination: string | null;
  module: "SIEM" | "EDR";
  mitre: string;
  analyst: string;
  status: AlertStatus;
  time: string;
}

export const mockKpis = {
  criticalAlerts: 3,
  highAlerts: 11,
  openIncidents: 7,
  resolvedToday: 18,
};

export const mockSeverityBreakdown: { severity: Severity; count: number }[] = [
  { severity: "CRITICAL", count: 75 },
  { severity: "HIGH", count: 88 },
  { severity: "MEDIUM", count: 94 },
  { severity: "LOW", count: 57 },
];

export const mockTopAttackSources = [
  { ip: "185.220.101.47", count: 88 },
  { ip: "91.108.4.200", count: 71 },
  { ip: "103.41.167.83", count: 55 },
  { ip: "45.155.205.12", count: 42 },
  { ip: "198.54.117.197", count: 29 },
  { ip: "77.83.197.65", count: 18 },
  { ip: "194.165.16.78", count: 11 },
];

export const mockAlerts: MockAlert[] = [
  {
    id: "ALT-0091",
    title: "Brute force — RDP exposed",
    severity: "CRITICAL",
    source: "185.220.101.47",
    destination: "10.0.1.12",
    module: "SIEM",
    mitre: "T1110",
    analyst: "Youssef K.",
    status: "escalated",
    time: "02:14",
  },
  {
    id: "ALT-0090",
    title: "Lateral movement — SMB relay",
    severity: "CRITICAL",
    source: "10.0.1.12",
    destination: "10.0.2.45",
    module: "EDR",
    mitre: "T1021",
    analyst: "Ahmed M.",
    status: "assigned",
    time: "01:58",
  },
  {
    id: "ALT-0089",
    title: "Ransomware indicator — file encryption spike",
    severity: "CRITICAL",
    source: "10.0.4.22",
    destination: null,
    module: "EDR",
    mitre: "T1486",
    analyst: "Youssef K.",
    status: "open",
    time: "01:44",
  },
  {
    id: "ALT-0088",
    title: "Outbound C2 beaconing detected",
    severity: "HIGH",
    source: "10.0.3.98",
    destination: "91.108.4.200",
    module: "SIEM",
    mitre: "T1071",
    analyst: "Sara K.",
    status: "open",
    time: "01:33",
  },
  {
    id: "ALT-0087",
    title: "Privilege escalation — SYSTEM token abuse",
    severity: "HIGH",
    source: "10.0.1.77",
    destination: null,
    module: "EDR",
    mitre: "T1068",
    analyst: "Youssef K.",
    status: "assigned",
    time: "01:11",
  },
  {
    id: "ALT-0086",
    title: "Suspicious PowerShell execution chain",
    severity: "HIGH",
    source: "10.0.3.14",
    destination: null,
    module: "EDR",
    mitre: "T1059",
    analyst: "Mourad B.",
    status: "assigned",
    time: "00:59",
  },
];
