import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Static (non-nonce) CSP — see node_modules/next/dist/docs/01-app/02-guides/
// content-security-policy.md. A nonce-based policy is stricter but forces every page into
// dynamic rendering (no static optimization), which isn't worth it here: this app has no
// third-party scripts, no user-supplied HTML, and nothing rendered via
// dangerouslySetInnerHTML (confirmed during the /security-review pass) for a nonce to
// meaningfully restrict beyond what 'self' already does.
// 'unsafe-inline' is kept for style-src/script-src because Next's App Router injects inline
// bootstrap scripts and critical CSS during hydration/streaming — removing it would require
// the nonce-based setup this app doesn't otherwise need.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self' data:;
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  ${isProd ? "upgrade-insecure-requests;" : ""}
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  // Belt-and-suspenders alongside CSP's frame-ancestors 'none' above — frame-ancestors is
  // the modern mechanism, but X-Frame-Options still matters for older browsers/clients that
  // don't parse CSP frame-ancestors. Clickjacking a SOC console into a hidden iframe is a
  // meaningfully worse outcome here than on a typical marketing site.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Mirrors the backend's helmet() HSTS config (backend/src/main.ts) — same 2-year max-age.
  // Only sent in production: HSTS on a plain-HTTP local dev server is inert but meaningless,
  // and could be actively confusing (some browsers cache the header's promise even before
  // the app is served over HTTPS anywhere).
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Removes the `X-Powered-By: Next.js` header Next sends by default — minor
  // framework-fingerprinting info leak, no reason to keep it.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
