import { Meter } from "@/components/meter";
import type { Career } from "@/lib/careers/data";
import { annualPay, medianPay, outlookText, payRange } from "@/lib/careers/labels";
import { CAPS, toPercent } from "@/lib/scale";
import { OutlookSource } from "./source-line";

/** Median pay with its bar, the usual range and the outlook (career page, and the home page's example). */
export function PayAndOutlook({ career, heading = "h2" }: { career: Career; heading?: "h2" | "h3" }) {
  const Heading = heading;
  const outlook = career.outlook!;
  const median = medianPay(outlook);
  const range = payRange(outlook);
  const yearly = annualPay(outlook);
  const prospects = outlookText(outlook.outlook, outlook.bright_reasons);
  // BLS sometimes publishes pay only for a wider job group than this career.
  const widerGroup = outlook.wage_soc_code && outlook.wage_soc_code !== career.soc_code;

  return (
    <section aria-labelledby="pay-heading" className="mt-12">
      <Heading id="pay-heading" className="text-lg font-bold">
        Pay and outlook
      </Heading>
      {median ? (
        <div className="mt-4">
          <p className="text-sm text-muted">Median pay</p>
          <p className="text-xl font-bold">{median}</p>
          {/* Where this pay sits on a fixed $0 to $200,000 scale: most people's
              range, with the median marked (DESIGN.md "Data graphics"). */}
          {yearly && (
            <div className="mt-3 max-w-md">
              <Meter
                percent={toPercent(yearly.median, CAPS.pay)}
                low={toPercent(yearly.low ?? yearly.median, CAPS.pay)}
                high={toPercent(yearly.high ?? yearly.median, CAPS.pay)}
              />
              <p aria-hidden="true" className="mt-1 flex justify-between text-sm text-muted">
                <span>$0</span>
                <span>$200,000</span>
              </p>
            </div>
          )}
          {range && <p className="mt-2">{range}</p>}
          {widerGroup && (
            <p className="mt-2 text-sm text-muted">Pay is for the wider job group this career belongs to.</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-muted">Pay not reported</p>
      )}
      {prospects && (
        <p className="mt-4">
          <strong>{prospects.name}.</strong> {prospects.detail}
        </p>
      )}
      <OutlookSource retrievedAt={outlook.retrieved_at} />
    </section>
  );
}
