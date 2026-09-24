import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { FootnoteMarkers } from "@/components/budget/footnote-marker";
import { BudgetTile } from "@/components/budget/budget-tile";
import { BudgetTotals } from "@/components/budget/budget-totals";
import { SourceFootnotes } from "@/components/budget/source-footnotes";
import { T } from "@/components/i18n/t";
import { JsonLd } from "@/components/json-ld";
import {
  budgetUnitLabel,
  getBudgetOverview,
} from "@/lib/budget";
import { getDatasetDate } from "@/lib/data";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Begroting",
  description:
    "De begrotingen van de twaalf ministeries: begrote uitgaven, ontvangsten en het verschil met het voorgaande jaar, met een bron per cijfer.",
  path: "/begroting/",
  snapshotDate: getDatasetDate(),
});

export default function BudgetOverviewPage() {
  const overview = getBudgetOverview();
  const sources = overview.sources;
  const unitLabel = budgetUnitLabel(overview.unit);
  const pageUrl = absoluteUrl("/begroting/");
  const allFootnotes = sources.map((_, index) => index + 1);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Begroting · ${SITE_NAME}`,
          description:
            "De begrotingen van de twaalf ministeries met bron per cijfer.",
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="common" k="navBudget" /> }]} />

      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          <T area="news" k="budgetHeading" />
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
          <T
            area="news"
            k="budgetIntro"
            vars={{
              count: overview.totals.expected,
              year: overview.fiscalYear,
              previous: overview.previousFiscalYear,
            }}
          />
        </p>
        {unitLabel !== null ? (
          <p className="mt-2 text-xs text-ink-faint">
            <T area="news" k="budgetUnitNote" vars={{ unit: unitLabel }} />
          </p>
        ) : null}
      </header>

      <section aria-labelledby="totalen-titel" className="border-b border-line py-6">
        <h2 id="totalen-titel" className="text-lg font-semibold tracking-tight text-ink">
          <T area="news" k="budgetTotalsHeading" />
          <FootnoteMarkers numbers={allFootnotes} />
        </h2>
        <div className="mt-4">
          <BudgetTotals overview={overview} />
        </div>
      </section>

      <section aria-labelledby="ministeries-titel" className="py-6">
        <h2 id="ministeries-titel" className="text-lg font-semibold tracking-tight text-ink">
          <T area="news" k="budgetMinistriesHeading" />
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          <T
            area="news"
            k="budgetMinistriesCaption"
            vars={{ count: overview.items.length, year: overview.fiscalYear }}
          />
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">
          <T area="news" k="budgetFootnoteIntro" />
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {overview.items.map((item) => (
            <li key={item.organization.id}>
              <BudgetTile item={item} unit={overview.unit} />
            </li>
          ))}
        </ul>
      </section>

      <SourceFootnotes sources={sources} />
    </>
  );
}
