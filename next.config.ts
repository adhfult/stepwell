import type { NextConfig } from "next";

/**
 * Security headers for every response (docs/SECURITY.md, "Add security
 * headers"). The Content-Security-Policy is set per request in src/proxy.ts,
 * because it carries a fresh nonce each time; these stay the same.
 */
const securityHeaders = [
  // Framing is also refused by the CSP's frame-ancestors; this covers older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Browsers only ever use https for two years (security audit 2026-09-30).
  // Ignored on http://localhost, so development is unaffected.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Don't announce the framework in an x-powered-by header.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
