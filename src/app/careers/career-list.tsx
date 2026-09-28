import Link from "next/link";
import { medianPay, resultFacts, type Pay } from "@/lib/careers/labels";

export type CareerListItem = {
  onet_code: string;
  title: string;
  job_zone: number | null;
  education_level: number | null;
  pay: Pay | null;
  /** A second line, such as "Also called: Nurse". */
  note?: string | null;
};

/** A list with dividers (DESIGN.md "Panels and lists"): title link, one line of facts. */
export function CareerList({ careers }: { careers: CareerListItem[] }) {
  return (
    <ul className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
      {careers.map((c) => {
        const pay = medianPay(c.pay);
        const facts = [resultFacts(c.education_level, c.job_zone), pay && `median pay ${pay}`]
          .filter(Boolean)
          .join(", ");
        return (
          <li key={c.onet_code} className="py-4">
            <Link href={`/careers/${c.onet_code}`} className="font-heading text-lg font-bold">
              {c.title}
            </Link>
            {c.note && <p className="mt-1 text-sm text-muted">{c.note}</p>}
            <p className="mt-1">
              {facts ? (
                facts.charAt(0).toUpperCase() + facts.slice(1)
              ) : (
                <span className="text-muted">Education, preparation and pay not reported</span>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
