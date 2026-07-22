// Sidebar structure. Kept as data instead of JSX so both the server layout (deciding what
// to render) and the module stub route ([module]/page.tsx) can share one source of truth
// for valid module slugs/labels.
export const MODULES = [
  { slug: "siem", label: "SIEM" },
  { slug: "soar", label: "SOAR" },
  { slug: "cti", label: "CTI" },
  { slug: "edr", label: "EDR" },
  { slug: "dfir", label: "DFIR" },
  { slug: "vm", label: "VM" },
] as const;

export type ModuleSlug = (typeof MODULES)[number]["slug"];

export function isModuleSlug(value: string): value is ModuleSlug {
  return MODULES.some((m) => m.slug === value);
}
