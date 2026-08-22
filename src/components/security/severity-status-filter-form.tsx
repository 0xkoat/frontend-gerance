import { SEVERITY_ORDER, SEVERITY_LABEL } from "@/lib/severity";
import { FilterFormActions } from "@/components/security/filter-form-actions";

export interface StatusOption {
  value: string;
  label: string;
}

interface SeverityStatusFilterFormProps {
  basePath: string;
  severity?: string;
  status?: string;
  assignedToMe?: string;
  statusOptions: StatusOption[];
}

// Shared by VM, SIEM, and DFIR's list pages — all three take the exact same three filters
// (severity, a module-specific status enum, "assigned to me"), differing only in which
// status values are valid for that module. No "use client" needed — same as the inline
// markup this replaces, it's a plain GET <form>, no client-side interactivity involved.
// EDR (severity + assignedToMe only, no status) and CTI/assets (different filter sets
// entirely) aren't forced into this shape — see each of those pages' own comments for why.
export function SeverityStatusFilterForm({
  basePath,
  severity,
  status,
  assignedToMe,
  statusOptions,
}: SeverityStatusFilterFormProps) {
  const hasAnyFilter = Boolean(severity || status || assignedToMe);

  return (
    <form method="GET" className="flex flex-wrap items-end gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Severity</span>
        <select
          name="severity"
          defaultValue={severity ?? ""}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          <option value="">All</option>
          {SEVERITY_ORDER.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Status</span>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          <option value="">All</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 pb-2">
        <input
          type="checkbox"
          name="assignedToMe"
          value="1"
          defaultChecked={assignedToMe === "1"}
        />
        Assigned to me
      </label>
      <FilterFormActions hasActiveFilters={hasAnyFilter} clearHref={basePath} />
    </form>
  );
}
