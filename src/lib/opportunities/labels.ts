const PER: Record<string, string> = {
  hour: "an hour",
  day: "a day",
  week: "a week",
  biweekly: "every two weeks",
  month: "a month",
  year: "a year",
};

/** "$18.50 to $24.00 an hour", "$41,966 a year"; cents only for hourly and daily pay. */
export function payText(p: { pay_min: number | null; pay_max: number | null; pay_interval: string | null }) {
  const cents = p.pay_interval === "hour" || p.pay_interval === "day";
  const money = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;
  const per = p.pay_interval ? ` ${PER[p.pay_interval]}` : "";
  const { pay_min: min, pay_max: max } = p;
  if (min && max && min !== max) return `${money(min)} to ${money(max)}${per}`;
  if (min || max) return `${min && max ? "" : min ? "From " : "Up to "}${money((min ?? max)!)}${per}`;
  return "Pay is on the posting";
}

/** A short places line: "Denver, Colorado and 3 more places". */
export function placesText(places: string[], remote: boolean) {
  if (places.length === 0) return remote ? "Remote" : "Place is on the posting";
  const more = places.length - 1;
  return more > 0 ? `${places[0]} and ${more} more ${more === 1 ? "place" : "places"}` : places[0];
}
