// Sidebar structure — the six security modules' nav labels, in the order the sidebar shows
// them. Kept as data instead of JSX so SidebarNav has one source of truth.
//
// `isModuleSlug`/`ModuleSlug` (and the `(dashboard)/[module]/page.tsx` stub they existed
// for) were removed in Phase 12 (2026-08-07) — once all six modules had real folders
// (Phases 3-8), the stub was unreachable for every slug (Next's router always resolves a
// static segment like `vm/` over a sibling dynamic one like `[module]/`, confirmed via the
// build's route table back in Phase 3 and re-confirmed here before deleting), and nothing
// else referenced either export.
export const MODULES = [
  { slug: "siem", label: "SIEM" },
  { slug: "soar", label: "SOAR" },
  { slug: "cti", label: "CTI" },
  { slug: "edr", label: "EDR" },
  { slug: "dfir", label: "DFIR" },
  { slug: "vm", label: "VM" },
] as const;
