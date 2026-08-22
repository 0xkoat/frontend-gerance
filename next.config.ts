import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
// Separate from isProd on purpose — isProd controls dev-only relaxations (unsafe-eval), but
// a real *deployed* instance can still be served over plain HTTP (no TLS termination in
// front of it yet) while running a genuine production build. Hit for real, 2026-08-22: the
// first time this app was accessed via anything other than localhost (a real VM IP), every
// CSS/JS/font asset failed to load — the page rendered as unstyled raw HTML — because
// `upgrade-insecure-requests` made the browser rewrite every relative asset request to
// https://, and that VM has no TLS listener anywhere. (localhost/loopback is specifically
// exempted from that CSP directive by browsers, which is why every earlier
// http://localhost:3001 smoke test in this project never surfaced this.) HTTPS_ENABLED
// defaults to unset/false, matching every deployment target that exists today; set it to
// "true" only once this app is genuinely served behind real TLS (a reverse proxy
// terminating HTTPS, or a cert given directly to Next).
const httpsEnabled = process.env.HTTPS_ENABLED === "true";

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
  ${httpsEnabled ? "upgrade-insecure-requests;" : ""}
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
  // Gated on httpsEnabled, not isProd (see that variable's own comment) — HSTS on a
  // plain-HTTP server is inert-per-spec (browsers ignore it outside a secure context) but
  // still actively confusing to send from a real deployed instance with no TLS anywhere.
  ...(httpsEnabled
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
  output: "standalone",
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
