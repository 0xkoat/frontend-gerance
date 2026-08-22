import Link from "next/link";
import { Button } from "@/components/ui/button";

interface FilterFormActionsProps {
  hasActiveFilters: boolean;
  clearHref: string;
}

// The trailing Apply/Clear-filters button pair shared by every module list page's filter
// <form> — extracted to close a SonarCloud duplication finding (jscpd found this exact pair
// byte-for-byte identical across EDR, CTI, and the asset feed page, on top of
// SeverityStatusFilterForm already covering VM/SIEM/DFIR's copy of the same pair). Meant to
// sit as the last child(ren) of a `<form method="GET">`, after whatever filter fields that
// page's own filter set needs.
export function FilterFormActions({
  hasActiveFilters,
  clearHref,
}: FilterFormActionsProps) {
  return (
    <>
      <Button type="submit" size="sm" variant="outline">
        Apply
      </Button>
      {hasActiveFilters && (
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={<Link href={clearHref}>Clear filters</Link>}
        />
      )}
    </>
  );
}
