import type { Metadata } from "next";
import { ChartPie, Landmark, Building2 } from "lucide";
import { SectionHeading } from "@/components/icons/section-heading";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { Breadcrumb } from "@/components/breadcrumb";
import { FootnoteMarkers } from "@/components/budget/footnote-marker";
import { BudgetRadar } from "@/components/budget/budget-radar";
import { BudgetTile } from "@/components/budget/budget-tile";
import { BudgetTotals } from "@/components/budget/budget-totals";
import { SourceFootnotes } from "@/components/budget/source-footnotes";
import { T } from "@/components/i18n/t";
import { JsonLd } from "@/components/json-ld";
import { getBudgetOverview, getBudgetRadarData } from "@/lib/budget";
import { getDatasetDate, getSourceById } from "@/lib/data";
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
  const pageUrl = absoluteUrl("/begroting/");
  const allFootnotes = sources.map((_, index) => index + 1);
  const itemFootnotes = [...new Set(overview.items.flatMap((item) => item.footnotes))].sort((a, b) => a - b);
  const radar = getBudgetRadarData();
  const markerSources = sources.map((ref) => {
    const source = getSourceById(ref.source);
    return source ? { href: source.url, title: source.title, retrieved: source.retrieved } : null;
  });

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
        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-ink">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-surface-inset text-accent-text">
            <LucideIcon icon={Landmark} size={22} />
          </span>
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
      </header>

      <section aria-labelledby="totalen-titel" className="border-b border-line py-6">
        <SectionHeading id="totalen-titel" icon={Landmark}>
          <T area="news" k="budgetTotalsHeadingYear" vars={{ year: overview.fiscalYear }} />
          <FootnoteMarkers numbers={allFootnotes} sources={markerSources} />
        </SectionHeading>
        <div className="mt-3">
          <BudgetTotals overview={overview} yearInHeading />
        </div>
      </section>

      <section aria-labelledby="verdeling-titel" className="border-b border-line py-6">
        <SectionHeading id="verdeling-titel" icon={ChartPie}>
          <T area="news" k="budgetRadarHeading" />
          <FootnoteMarkers numbers={allFootnotes} sources={markerSources} />
        </SectionHeading>
        <div className="mt-3">
          <BudgetRadar data={radar} />
        </div>
      </section>

      <section aria-labelledby="ministeries-titel" className="py-6">
        <SectionHeading id="ministeries-titel" icon={Building2}>
          <T area="news" k="budgetMinistriesHeadingYear" vars={{ year: overview.fiscalYear }} />
          <FootnoteMarkers numbers={itemFootnotes} sources={markerSources} />
        </SectionHeading>
        <ul className="mt-3 grid grid-cols-1 gap-2 @[40rem]:grid-cols-2 @[40rem]:gap-3">
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
