import Link from "next/link";
import { Page, PageTitle } from "@/components/page";
import { CareerSearchForm } from "./careers/search-form";

export default function Home() {
  return (
    <Page>
      <PageTitle>Stepwell</PageTitle>
      <p className="mt-4">
        Stepwell helps you see where a career leads: what the work is, what it takes, and which careers are related,
        using official U.S. government data. It’s free, with no ads.
      </p>
      <CareerSearchForm />
      <p className="mt-6">
        Or <Link href="/careers">see some careers to start with</Link>.
      </p>
    </Page>
  );
}
