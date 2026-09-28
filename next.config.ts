import type { NextConfig } from "next";

/**
 * Security headers for every page (docs/SECURITY.md, "Add security headers").
 * The CSP is deliberately partial: it blocks framing, <base> tricks, form posts
 * to other sites and plugins. A full script-src policy needs per-request
 * nonces and is a launch blocker tracked in docs/specs/accounts-and-profile.md.
 */
const contentSecurityPolicy = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Older browsers that don't read frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Don't announce the framework in an x-powered-by header.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
