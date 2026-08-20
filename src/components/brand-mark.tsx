// The product's mark: a hexagon (this platform's own "6 MODULES" figure on
// the login page, and a natural cell/node/shield silhouette for a security
// product) carrying a monitoring pulse line instead of a literal "S" — the
// wordmark that sits next to this everywhere it's used already spells the
// name out, so the mark's job is to be recognizable at a glance, not to
// relabel the product. Same shape as src/app/icon.tsx (the browser-tab
// favicon, generated via next/og's ImageResponse — a different render path
// that can't share this component directly, so the two are kept in visual
// sync by eye, not by import). Color is the existing brand accent
// (`#6c63ff`) — unchanged from the original mark, this is a shape refresh,
// not a rebrand.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="SecOps"
    >
      <polygon
        points="16,0 29.86,8 29.86,24 16,32 2.14,24 2.14,8"
        fill="#6c63ff"
      />
      <polyline
        points="6,17 11,17 14,10 17,23 20,17 26,17"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
