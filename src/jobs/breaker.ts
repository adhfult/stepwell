// Circuit breaker (v1 expansion, Section 3.2 step 7): a source that suddenly
// returns far less, or mostly junk, is broken; students keep the last good data.

export function breakerReason({
  valid,
  rejected,
  lastValid,
}: {
  valid: number;
  rejected: number;
  lastValid: number | null; // valid records in the last successful run; null on the first run
}): string | null {
  if (valid === 0) return "No valid records";
  const total = valid + rejected;
  if (rejected / total > 0.2) return `${rejected} of ${total} records rejected (over 20%)`;
  if (lastValid !== null && valid < lastValid * 0.5) {
    return `Only ${valid} valid records, under half of the last successful run (${lastValid})`;
  }
  return null;
}
