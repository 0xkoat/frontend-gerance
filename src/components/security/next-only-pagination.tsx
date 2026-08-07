import Link from "next/link";
import { Button } from "@/components/ui/button";

// Shared by every module list page (Phase 3 onward) and the asset feed. A simplified variant
// of (dashboard)/users' Previous/Next controls, without the "Page X of Y" label that implies
// a known total — see src/lib/query-filters.ts's hasNextPage() for why these list endpoints
// can't honestly report one (decision 9 in CLAUDE.md's adaptation plan).
export function NextOnlyPagination({
  page,
  hasNextPage,
  buildHref,
}: {
  page: number;
  hasNextPage: boolean;
  buildHref: (page: number) => string;
}) {
  if (page <= 1 && !hasNextPage) return null;

  return (
    <div className="flex items-center gap-2">
      {page <= 1 ? (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          render={<Link href={buildHref(page - 1)}>Previous</Link>}
        />
      )}
      <span className="text-xs text-muted-foreground tabular-nums">
        Page {page}
      </span>
      {hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          render={<Link href={buildHref(page + 1)}>Next</Link>}
        />
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      )}
    </div>
  );
}
