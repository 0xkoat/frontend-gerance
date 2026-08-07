import type { BaseQueryFilters } from "@/types/security";

// Turns a module list page's filter state into the URLSearchParams every module's list
// Route Handler forwards to the backend's shared BaseQueryDto. Dates are serialized as ISO
// strings — the backend's `@Type(() => Date)` needs a parseable string on the wire, a Date
// object doesn't survive query-string serialization anyway.
export function buildQueryParams(filters: BaseQueryFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.severity) params.set("severity", filters.severity);
  if (filters.assignedToUserId) {
    params.set("assignedToUserId", filters.assignedToUserId);
  }
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom.toISOString());
  if (filters.dateTo) params.set("dateTo", filters.dateTo.toISOString());
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.pageSize !== undefined) {
    params.set("pageSize", String(filters.pageSize));
  }

  return params;
}

// Every module's query()/getUnifiedFeed returns a bare array with no total count (see
// CLAUDE.md's "Known gaps" — only GET /users runs a real count()). This is the "Next
// enabled while the last page was full" heuristic from decision 9 of the adaptation plan:
// a full page means there might be more, a short page means this was the last one. Not
// page-count-aware — there's no honest way to be without a backend change.
export function hasNextPage(itemCount: number, pageSize: number): boolean {
  return itemCount >= pageSize;
}
