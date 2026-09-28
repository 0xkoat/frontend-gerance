import type { ModuleName } from "@/types/modules";

export const MODULE_DESCRIPTIONS: Record<ModuleName, string> = {
  SIEM: "Security information and event management",
  SOAR: "Security orchestration, automation and response",
  CTI: "Cyber threat intelligence",
  EDR: "Endpoint detection and response",
  DFIR: "Digital forensics and incident response",
  VM: "Vulnerability management",
};
