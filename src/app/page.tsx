import Link from "next/link";
import { Page, PageTitle } from "@/components/page";
import { CareerSearchForm } from "./careers/search-form";
import { StepwellScene, type Stop } from "./stepwell-scene";

// The path through Stepwell, drawn as the stepwell scene (DESIGN.md),
// each stop with a real screenshot of that step (public/screenshots/, taken at
// 390px on a production build with a test account).
// Shared look for the screenshots: flat, with a border-subtle edge (DESIGN.md "Images").
// A plain <img>: next/image adds an inline style, which the CSP blocks.
const SHOT = { width: 356, height: 500, loading: "lazy", className: "h-auto w-full max-w-[240px] border border-border-subtle" } as const;

const STOPS: Stop[] = [
  {
    title: "Careers",
    text: "See what the work is, what it pays, what training it takes, and the AP classes that help.",
    links: [
      { href: "/careers", label: "Search careers" },
      { href: "/interests", label: "Take the interest quiz" },
    ],
    // eslint-disable-next-line @next/next/no-img-element
    image: <img src="/screenshots/career.png" alt="The pay and outlook section of the registered nurses page: median pay of $97,550 a year and a bright outlook, with its source." {...SHOT} loading="eager" />,
  },
  {
    title: "Programs and colleges",
    text: "From any career, find the college programs that lead there, with cost, graduation rate and what graduates earn.",
    links: [{ href: "/careers", label: "Start from a career" }],
    // eslint-disable-next-line @next/next/no-img-element
    image: <img src="/screenshots/colleges.png" alt="Nursing programs at Ohio colleges, each with graduates' earnings, loan debt, net price and graduation rate." {...SHOT} />,
  },
  {
    title: "Money and experience",
    text: "Scholarships and grants from official state and federal programs, paid federal internships, and free or paid summer programs.",
    links: [
      { href: "/scholarships", label: "Find scholarships" },
      { href: "/internships", label: "Find internships" },
      { href: "/programs", label: "Find summer programs" },
    ],
    // eslint-disable-next-line @next/next/no-img-element
    image: <img src="/screenshots/scholarships.png" alt="Scholarships for Ohio high school students, with award amounts, deadlines and links to apply on the official sites." {...SHOT} />,
  },
  {
    title: "Your plan",
    text: "Save what fits and lay it out year by year, next to the real deadlines.",
    links: [{ href: "/plan", label: "Start your plan" }],
    // eslint-disable-next-line @next/next/no-img-element
    image: <img src="/screenshots/plan.png" alt="A student's plan open at 11th grade, starting with Take AP Biology and a button to mark it done." {...SHOT} />,
  },
];

export default function Home() {
  return (
    <Page width="browse">
      <div className="max-w-2xl">
        <PageTitle size="hero">Find a career, then the path to it</PageTitle>
        <p className="mt-4">
          Stepwell shows what a career pays and takes, which college programs lead there, and the scholarships,
          internships and summer programs that help you get started. It uses official U.S. government data, and
          it’s free, with no ads.
        </p>
        <CareerSearchForm />
        <p className="mt-6">
          Not sure what you like? <Link href="/interests">Take the interest quiz</Link> and see careers that fit you.
        </p>
      </div>

      <StepwellScene stops={STOPS} />

      <p className="mt-12 max-w-2xl">
        Stepwell never sells your information or shares it with colleges or companies, and you can use most of it
        without an account.{" "}
        <Link href="/about-data">See where the data comes from</Link>.
      </p>
    </Page>
  );
}
