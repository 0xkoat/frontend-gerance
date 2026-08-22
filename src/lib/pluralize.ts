// Tiny "N noun(s)" formatter shared by every module list page's count display (see
// components/security/item-count-pagination.tsx) — extracted to close a SonarCloud
// duplication finding, this exact `${count} X${count === 1 ? "" : "s"}` expression was
// hand-repeated across seven page.tsx files. `plural` covers the one irregular case (VM's
// "vulnerability"/"vulnerabilities") — every other module's noun just adds an "s".
export function pluralize(
  count: number,
  singular: string,
  plural: string = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
