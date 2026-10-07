// Census county list by state (data/counties.json, docs/DATA_SOURCES.md).
// Server code only: the whole list is about 90 KB, so pages pass one state's
// counties to the browser rather than importing this in a client component.
import counties from "../../../data/counties.json";

const BY_STATE: Record<string, string[][]> = counties; // [fips, name] pairs

/** One state's counties as select options. */
export const countiesOf = (state: string) => (BY_STATE[state] ?? []).map(([value, label]) => ({ value, label }));

export const isCountyIn = (fips: string, state: string) => (BY_STATE[state] ?? []).some(([f]) => f === fips);
