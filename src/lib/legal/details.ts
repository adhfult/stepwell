/**
 * The facts the Terms and Privacy pages need (docs/specs/legal-pages.md).
 * Values in [BRACKETS] are still to be decided; docs/LAUNCH.md requires none
 * to be left before real students sign up (placeholdersLeft() says which).
 */
export const LEGAL = {
  contactEmail: "[CONTACT EMAIL]",
  emailProvider: "[EMAIL PROVIDER]",
  lawState: "[STATE]",
  effectiveDate: "[EFFECTIVE DATE]",
} as const;

export function placeholdersLeft(details: Record<string, string> = LEGAL): string[] {
  return Object.entries(details)
    .filter(([, value]) => /^\[.*\]$/.test(value))
    .map(([key]) => key);
}
