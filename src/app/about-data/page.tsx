import type { Metadata } from "next";
import { Page, PageTitle } from "@/components/page";
import { getSourceDates } from "@/lib/sources/data";
import { updatedText } from "@/lib/sources/labels";

export const metadata: Metadata = { title: "About the data" };

const CC_BY = "https://creativecommons.org/licenses/by/4.0/";

/** One entry per row in public.sources; the text is static so the page still reads if the dates fail. */
const SOURCES = [
  {
    id: "onet",
    name: "O*NET Database",
    publisher: "U.S. Department of Labor, Employment and Training Administration (USDOL/ETA)",
    uses: "Careers: what workers do, skills, education, interest areas, and the knowledge ratings Stepwell matches to AP classes.",
    url: "https://www.onetcenter.org/database.html",
  },
  {
    id: "onet_ip",
    name: "O*NET Interest Profiler questions (O*NET Web Services)",
    publisher: "USDOL/ETA",
    uses: "The questions in the interest quiz. Stepwell scores your answers itself.",
    url: "https://services.onetcenter.org/",
  },
  {
    id: "onet_outlook",
    name: "Pay and job outlook (O*NET Web Services)",
    publisher: "U.S. Bureau of Labor Statistics wage estimates and employment projections, through USDOL/ETA",
    uses: "Pay and whether a career is growing. Pay is for the whole country unless the page says otherwise.",
    url: "https://services.onetcenter.org/",
  },
  {
    id: "onet_cip",
    name: "O*NET crosswalk: 2020 CIP to O*NET-SOC 2019",
    publisher: "USDOL/ETA",
    uses: "Which college programs lead to which careers.",
    url: "https://www.onetcenter.org/crosswalks.html",
  },
  {
    id: "scorecard",
    name: "College Scorecard",
    publisher: "U.S. Department of Education",
    uses: "Colleges and their programs: cost, graduation rates and earnings after college.",
    url: "https://collegescorecard.ed.gov/",
  },
  {
    id: "official_list",
    name: "Official scholarship and grant programs",
    publisher: "Federal and state agencies, each named on its listing",
    uses: "Scholarships and grants. Stepwell picks the programs and copies the facts by hand from each official page, which every listing links to.",
    url: "https://studentaid.gov/understand-aid/types/grants",
  },
  {
    id: "cos_youth_programs",
    name: "CareerOneStop: youth programs",
    publisher: "U.S. Department of Labor (DOLETA) and the Minnesota Department of Employment and Economic Development (DEED)",
    uses: "Youth job programs near you, on the summer programs page.",
    url: "https://www.careeronestop.org/",
  },
  {
    id: "cos_licenses",
    name: "CareerOneStop: licenses",
    publisher: "DOLETA and Minnesota DEED, from each state's licensing agencies",
    uses: "Which license a career needs in your state, and the agency that gives it.",
    url: "https://www.careeronestop.org/",
  },
  {
    id: "cos_certifications",
    name: "CareerOneStop: certifications",
    publisher: "DOLETA and Minnesota DEED",
    uses: "Core certifications for each career.",
    url: "https://www.careeronestop.org/",
  },
  {
    id: "usajobs",
    name: "USAJOBS",
    publisher: "U.S. Office of Personnel Management",
    uses: "Paid federal internships open to students.",
    url: "https://www.usajobs.gov/",
  },
];

export default async function AboutDataPage() {
  const dates = await getSourceDates();
  return (
    <Page>
      <PageTitle>About the data</PageTitle>
      <div className="mt-6 space-y-4">
        <p>
          Stepwell copies official U.S. government data into its own database on a schedule, so pages never wait on
          a government server. Each source below says who publishes it, what Stepwell uses it for and when Stepwell
          last updated it.
        </p>
        {!dates && <p>We couldn’t load the update dates. The rest of this page is current.</p>}
      </div>

      {SOURCES.map((s) => (
        <section key={s.id} aria-labelledby={`${s.id}-heading`} className="mt-10">
          <h2 id={`${s.id}-heading`} className="text-lg font-bold">
            {s.name}
          </h2>
          <p className="mt-2 text-sm text-muted">{s.publisher}</p>
          <p className="mt-2">{s.uses}</p>
          <p className="mt-2">
            <a href={s.url}>{new URL(s.url).hostname.replace(/^www\./, "")}</a>
          </p>
          {dates && <p className="mt-2 text-sm text-muted">{updatedText(dates.get(s.id))}</p>}
        </section>
      ))}

      <section aria-labelledby="onet-credit-heading" className="mt-10">
        <h2 id="onet-credit-heading" className="text-lg font-bold">
          O*NET credit
        </h2>
        <p className="mt-2">
          This site includes information from the O*NET Database and{" "}
          <a href="https://services.onetcenter.org/">O*NET Web Services</a> by the U.S. Department of Labor,
          Employment and Training Administration (USDOL/ETA). Used under the <a href={CC_BY}>CC BY 4.0 license</a>.
          Stepwell shows a selection of this data and has not been endorsed by USDOL/ETA. O*NET is a trademark of
          USDOL/ETA.
        </p>
      </section>

      <section aria-labelledby="limits-heading" className="mt-10">
        <h2 id="limits-heading" className="text-lg font-bold">
          What this data can’t tell you
        </h2>
        <ul className="mt-2 list-disc space-y-2 pl-6">
          <li>Pay is for the whole country unless it says otherwise. Pay where you live may be higher or lower.</li>
          <li>College numbers are averages over past students. Your own cost and results will differ.</li>
          <li>
            Scholarship and internship details change. The official page has the final word, so check it before you
            apply.
          </li>
          <li>
            Some choices are Stepwell’s own, not the government’s: which AP classes fit a career, and which
            scholarships are listed.
          </li>
        </ul>
      </section>
    </Page>
  );
}
