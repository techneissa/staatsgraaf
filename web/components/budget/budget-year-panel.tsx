import { FootnoteMarkers } from "./footnote-marker";
import type { SourceIconItem } from "@/components/source-icon";
import { BudgetTotals } from "./budget-totals";
import { MinistryBars } from "./ministry-bars";
import { MinistryTable } from "./ministry-table";
import { SectionHeading } from "@/components/icons/section-heading";
import { T } from "@/components/i18n/t";
import { Building2, Landmark } from "lucide";
import type { BudgetOverview } from "@/lib/budget";

/**
 * Everything on /begroting that depends on the budget year: the four totals,
 * the ranked ministries and the table with the exact numbers. Rendered on the
 * server once per year; the year switch decides which one is visible.
 */
export function BudgetYearPanel({
  overview,
  markerSources,
}: {
  overview: BudgetOverview;
  markerSources: (SourceIconItem | null)[];
}) {
  const year = overview.fiscalYear;
  const itemFootnotes = [...new Set(overview.items.flatMap((item) => item.footnotes))].sort((a, b) => a - b);
  const totalsId = `totalen-${year}`;
  const barsId = `uitgaven-${year}`;
  return (
    <div className="space-y-6">
      <section aria-labelledby={totalsId}>
        <SectionHeading id={totalsId} icon={Landmark}>
          <T area="news" k="budgetTotalsHeadingYear" vars={{ year }} />
          <FootnoteMarkers numbers={itemFootnotes} sources={markerSources} />
        </SectionHeading>
        <div className="mt-3">
          <BudgetTotals overview={overview} />
        </div>
      </section>

      <section aria-labelledby={barsId}>
        <SectionHeading id={barsId} icon={Building2}>
          <T area="news" k="budgetMinistriesHeadingYear" vars={{ year }} />
          <FootnoteMarkers numbers={itemFootnotes} sources={markerSources} />
        </SectionHeading>
        <div className="mt-2">
          <MinistryBars items={overview.items} unit={overview.unit} previousYear={overview.previousFiscalYear} labelledBy={barsId} />
          <MinistryTable overview={overview} />
        </div>
      </section>
    </div>
  );
}
