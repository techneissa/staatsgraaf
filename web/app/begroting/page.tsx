import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { BudgetTile } from "@/components/budget/budget-tile";
import { BudgetTotals } from "@/components/budget/budget-totals";
import { JsonLd } from "@/components/json-ld";
import { SourceList } from "@/components/source-list";
import {
  budgetUnitLabel,
  getBudgetOverview,
  getBudgetOverviewSources,
} from "@/lib/budget";
import { formatCount } from "@/lib/format";
import { canonical, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Begroting",
  description:
    "De begrotingen van de twaalf ministeries: begrote uitgaven, ontvangsten en het verschil met het voorgaande jaar, met een bron per cijfer.",
  alternates: canonical("/begroting/"),
};

export default function BudgetOverviewPage() {
  const overview = getBudgetOverview();
  const sources = getBudgetOverviewSources(overview);
  const unitLabel = budgetUnitLabel(overview.unit);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Begroting · ${SITE_NAME}`,
          description:
            "De begrotingen van de twaalf ministeries met bron per cijfer.",
        }}
      />

      <Breadcrumb items={[{ label: "NL Overheid Graph", href: "/" }, { label: "Begroting" }]} />

      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Begroting</h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
          De begrotingen van de {formatCount(overview.totals.expected)} ministeries voor{" "}
          {overview.fiscalYear}, met het verschil ten opzichte van {overview.previousFiscalYear}. Elk
          bedrag komt uit de begrotingsstaten en is per organisatie na te lopen.
        </p>
        {unitLabel !== null ? (
          <p className="mt-2 text-xs text-ink-faint">
            Alle bedragen in {unitLabel}, tenzij anders vermeld.
          </p>
        ) : null}
      </header>

      <section aria-labelledby="totalen-titel" className="border-b border-line py-6">
        <h2 id="totalen-titel" className="text-lg font-semibold tracking-tight text-ink">
          Totalen
        </h2>
        <div className="mt-4">
          <BudgetTotals overview={overview} />
        </div>
      </section>

      <section aria-labelledby="ministeries-titel" className="py-6">
        <h2 id="ministeries-titel" className="text-lg font-semibold tracking-tight text-ink">
          Ministeries
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {formatCount(overview.items.length)} begrotingen, gesorteerd op begrote uitgaven in{" "}
          {overview.fiscalYear}.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {overview.items.map((item) => (
            <li key={item.organization.id}>
              <BudgetTile item={item} unit={overview.unit} />
            </li>
          ))}
        </ul>
      </section>

      <SourceList sources={sources} title="Bronnen" />
    </>
  );
}
