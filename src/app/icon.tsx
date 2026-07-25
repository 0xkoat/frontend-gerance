import { ImageResponse } from "next/og";

// Next.js App Router icon convention (src/app/icon.tsx) — generates favicon/tab-icon markup
// automatically, replacing the old public/favicon.ico + <link> approach. See
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md.
// Matches the sidebar's brand mark (src/components/dashboard/sidebar-nav.tsx) so the
// browser tab and the in-app logo use the same mark instead of two different placeholders.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#6c63ff",
        borderRadius: 6,
        color: "white",
        fontSize: 20,
        fontWeight: 700,
        fontFamily: "sans-serif",
      }}
    >
      S
    </div>,
    { ...size },
  );
}
