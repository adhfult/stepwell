/**
 * The only way a redirect target from a URL or form becomes a redirect
 * (SECURITY.md: "redirects only go to Stepwell's own pages"). Returns a
 * same-site path, or `fallback` for anything else, so a crafted link like
 * `?next=//evil.example` can never send a student off-site.
 */
export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;

  // Must be a path on this site: "/..." but not "//host" or "/\host", which
  // browsers treat as another site. No backslashes or control characters anywhere.
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }

  // Belt and braces: resolve against a placeholder origin and make sure the
  // result is still on it.
  const base = "http://stepwell.invalid";
  const url = new URL(value, base);
  if (url.origin !== base) return fallback;

  return url.pathname + url.search + url.hash;
}
