import { ImageResponse } from "next/og";

// Next.js App Router icon convention (src/app/icon.tsx) — generates favicon/tab-icon markup
// automatically, replacing the old public/favicon.ico + <link> approach. See
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md.
//
// Real brand mark, not the earlier bold-letter-in-a-rounded-square placeholder (a generic
// AI-default shape — see the "Known gaps" note this replaces in CLAUDE.md). A hexagon —
// this platform's own "6 MODULES" figure on the login page and a natural "cell/node/shield"
// silhouette for a security product — carrying a monitoring pulse line instead of a literal
// "S", since the wordmark right next to this icon in the sidebar already spells the name out;
// the icon's job is to be recognizable at 16px in a browser tab, not to relabel the product.
// Same mark used in src/components/dashboard/sidebar-nav.tsx so the tab icon and the in-app
// logo match. Color is the existing brand accent (`#6c63ff`, sidebar-nav.tsx) — unchanged,
// since this is a mark refresh, not a rebrand.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#6c63ff",
            clipPath:
              "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <polyline
              points="4,17 10,17 13,9 16,24 19,17 28,17"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    ),
    { ...size },
  );
}
