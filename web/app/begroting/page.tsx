import type { Metadata } from "next";
import { ChartPie, Landmark, TrendingUp } from "lucide";
import { SectionHeading } from "@/components/icons/section-heading";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { Breadcrumb } from "@/components/breadcrumb";
import { BudgetRadar } from "@/components/budget/budget-radar";
import { BudgetTrendChart } from "@/components/budget/budget-trend-chart";
import { BudgetYearPanel } from "@/components/budget/budget-year-panel";
import { DisclosureChevron } from "@/components/budget/disclosure-chevron";
import { SourceFootnotes } from "@/components/budget/source-footnotes";
import { YearSwitch } from "@/components/budget/year-switch";
import { T } from "@/components/i18n/t";
import { JsonLd } from "@/components/json-ld";
import {
  BUDGET_OVERVIEW_YEAR,
  getBudgetOverview,
  getBudgetPageSources,
  getBudgetRadarData,
  getBudgetTrends,
  getBudgetYears,
} from "@/lib/budget";
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
  const sources = getBudgetPageSources();
  const years = getBudgetYears();
  const defaultYear = years.includes(BUDGET_OVERVIEW_YEAR) ? BUDGET_OVERVIEW_YEAR : years[years.length - 1];
  const overviews = years.map((year) => getBudgetOverview(year, sources));
  const headline = overviews[years.indexOf(defaultYear)];
  const pageUrl = absoluteUrl("/begroting/");
  const radar = getBudgetRadarData();
  const trends = getBudgetTrends();
  const markerSources = sources.map((ref) => {
    const source = getSourceById(ref.source);
    return source ? { href: source.url, title: source.title, retrieved: source.retrieved } : null;
  });
  const lateStarters = trends.lateStarters;
  const lateFrom = lateStarters.length > 0 ? Math.max(...lateStarters.map((entry) => entry.from)) : null;

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
              count: headline.totals.expected,
              year: headline.fiscalYear,
              previous: headline.previousFiscalYear,
            }}
          />
        </p>
      </header>

      <div className="border-b border-line py-6">
        <YearSwitch
          years={years}
          defaultYear={defaultYear}
          panels={overviews.map((overview) => (
            <BudgetYearPanel key={overview.fiscalYear} overview={overview} markerSources={markerSources} />
          ))}
        />
      </div>

      <section aria-labelledby="jaren-titel" className="border-b border-line py-6">
        <SectionHeading id="jaren-titel" icon={TrendingUp}>
          <T area="news" k="budgetTrendHeading" />
        </SectionHeading>
        <div className="mt-3">
          <BudgetTrendChart
            series={[trends.total, ...trends.ministries]}
            defaultId="total"
            selectable
            note={
              lateFrom !== null ? (
                <p key="late-start" className="mt-1 text-xs leading-relaxed text-ink-faint">
                  <T
                    area="news"
                    k="budgetTrendLateStart"
                    vars={{ names: lateStarters.map((entry) => entry.name.replace(/^Ministerie van /u, "")).join(", "), year: lateFrom }}
                  />
                </p>
              ) : null
            }
          />
        </div>
      </section>

      <section aria-labelledby="verdeling-titel" className="py-3">
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
            <DisclosureChevron className="text-ink-muted" />
            <h2 id="verdeling-titel" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
              <LucideIcon icon={ChartPie} size={18} className="shrink-0 text-ink-muted" />
              <T area="news" k="budgetRadarHeading" />
            </h2>
          </summary>
          <div className="mt-2">
            <BudgetRadar data={radar} />
          </div>
        </details>
      </section>

      <SourceFootnotes sources={sources} />
    </>
  );
}
