/**
 * A data bar (DESIGN.md "Data graphics"): border-subtle track, primary fill.
 * With low and high it draws a range with a foreground tick at the value.
 * Sized with SVG attributes, not style=, because the CSP blocks inline
 * styles. Always hidden from screen readers: the number is printed beside it.
 */
export function Meter({
  percent,
  low,
  high,
  className = "",
}: {
  /** The value's place on its scale, 0–100 (see toPercent in lib/scale). */
  percent: number;
  low?: number;
  high?: number;
  className?: string;
}) {
  const range = low !== undefined && high !== undefined;
  return (
    <svg aria-hidden="true" width="100%" height="12" className={`block ${className}`}>
      <rect y="2" width="100%" height="8" className="fill-border-subtle" />
      {range ? (
        <>
          <rect x={`${low}%`} y="2" width={`${high - low}%`} height="8" className="fill-primary" />
          <line x1={`${percent}%`} x2={`${percent}%`} y1="0" y2="12" strokeWidth="3" className="stroke-foreground" />
        </>
      ) : (
        <rect y="2" width={`${percent}%`} height="8" className="fill-primary" />
      )}
    </svg>
  );
}
