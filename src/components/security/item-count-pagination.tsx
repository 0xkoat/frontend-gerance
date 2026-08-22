import { CardTitle } from "@/components/ui/card";
import { NextOnlyPagination } from "@/components/security/next-only-pagination";
import { pluralize } from "@/lib/pluralize";

interface ItemCountPaginationProps {
  count: number;
  singular: string;
  plural?: string;
  page: number;
  hasNextPage: boolean;
  buildHref: (page: number) => string;
}

// The "{count} thing(s) on this page" + <NextOnlyPagination> pair shared by every module
// list page (VM, EDR, SIEM, CTI, SOAR, DFIR, assets) — extracted to close a SonarCloud
// duplication finding, jscpd found the exact same CardTitle/NextOnlyPagination combination
// byte-for-byte identical (differing only in the noun and the page's basePath) across all
// seven. Deliberately renders just the CardTitle + pagination pair, not a wrapping <div> —
// callers differ on that wrapper (most use a `flex justify-between` div inside a
// `flex-col` CardHeader, SOAR's executions section puts the pair directly in a
// `flex flex-row justify-between` CardHeader instead), so the wrapper stays with each page.
export function ItemCountPagination({
  count,
  singular,
  plural,
  page,
  hasNextPage,
  buildHref,
}: ItemCountPaginationProps) {
  return (
    <>
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {pluralize(count, singular, plural)} on this page
      </CardTitle>
      <NextOnlyPagination
        page={page}
        hasNextPage={hasNextPage}
        buildHref={buildHref}
      />
    </>
  );
}
