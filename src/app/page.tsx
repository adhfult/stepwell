import { Page, PageTitle } from "@/components/page";

/**
 * Starter page. Replace it once docs/PRODUCT.md and docs/design/DESIGN.md
 * describe what this project is and how it should look.
 */
export default function Home() {
  return (
    <Page>
      <PageTitle>Stepwell</PageTitle>
      <p className="mt-4">Helps students connect careers to programs and colleges using official U.S. data.</p>
      <p className="mt-8 border border-border-subtle bg-surface px-4 py-3 text-sm text-muted">
        This page is a placeholder. Next steps are in <code>docs/PRODUCT.md</code>.
      </p>
    </Page>
  );
}
