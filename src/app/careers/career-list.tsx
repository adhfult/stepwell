import Link from "next/link";
import { Meter } from "@/components/meter";
import { annualPay, medianPay, resultFacts, type Pay } from "@/lib/careers/labels";
import { CAPS, toPercent } from "@/lib/scale";

export type CareerListItem = {
  onet_code: string;
  title: string;
  job_zone: number | null;
  education_level: number | null;
  pay: Pay | null;
  /** A second line, such as "Also called: Nurse". */
  note?: string | null;
};

/**
 * A list with dividers (DESIGN.md "Panels and lists"): title link, one line of
 * facts, and median pay with a bar (DESIGN.md "Data graphics"), beside the
 * title from 640px and under it on phones.
 */
export function CareerList({ careers }: { careers: CareerListItem[] }) {
  return (
    <ul className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
      {careers.map((c) => {
        const pay = medianPay(c.pay);
        const yearly = annualPay(c.pay);
        const facts = resultFacts(c.education_level, c.job_zone);
        return (
          <li key={c.onet_code} className="py-4 sm:flex sm:items-start sm:justify-between sm:gap-8">
            <div>
              <Link href={`/careers/${c.onet_code}`} className="font-heading text-lg font-bold">
                {c.title}
              </Link>
              {c.note && <p className="mt-1 text-sm text-muted">{c.note}</p>}
              <p className="mt-1">
                {facts ? (
                  facts.charAt(0).toUpperCase() + facts.slice(1)
                ) : (
                  <span className="text-muted">Education and preparation not reported</span>
                )}
              </p>
            </div>
            <div className="mt-2 w-48 shrink-0 sm:mt-1 sm:text-right">
              {pay ? (
                <>
                  <p>
                    <span className="text-sm text-muted">Median pay</span>{" "}
                    <span className="font-bold sm:block">{pay}</span>
                  </p>
                  {yearly && <Meter percent={toPercent(yearly.median, CAPS.pay)} className="mt-1" />}
                </>
              ) : (
                <p className="text-muted">Pay not reported</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
