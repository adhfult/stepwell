/** "Last updated September 29, 2026", or "Not loaded yet" for a source that never loaded. */
export function updatedText(lastSuccessAt: string | null | undefined) {
  if (!lastSuccessAt) return "Not loaded yet";
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/New_York" });
  return `Last updated ${date.format(new Date(lastSuccessAt))}`;
}
