import type { Metadata } from "next";
import { HandCoins, Layers, PieChart, Scale, TrendingUp, Wallet } from "lucide";
import { SectionHeading } from "@/components/icons/section-heading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { Amount } from "@/components/budget/amount";
import { BudgetBreakdown } from "@/components/budget/budget-breakdown";
import { BudgetHistory } from "@/components/budget/budget-history";
import { BudgetOrgName } from "@/components/budget/budget-org-name";
import { BudgetTrendChart } from "@/components/budget/budget-trend-chart";
import { BudgetYearFigures } from "@/components/budget/budget-year-figures";
import { ChangeIndicator } from "@/components/budget/change-indicator";
import { DisclosureChevron } from "@/components/budget/disclosure-chevron";
import { StatTile } from "@/components/budget/stat-tile";
import { ShareLabel } from "@/components/budget/budget-bits";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { MinistryIcon } from "@/components/icons/ministry-icon";
import { branchColorVar } from "@/lib/branch-colors";
import { L, T } from "@/components/i18n/t";
import { DictEmptyState } from "@/components/budget/dict-empty-state";
import { JsonLd } from "@/components/json-ld";
import { SourceList, SourceRow } from "@/components/source-list";
import { SourceIcons } from "@/components/source-icon";
import {
  BUDGET_OVERVIEW_YEAR,
  budgetDelta,
  getBudgetByOrganizationSlug,
  getBudgetOrganizations,
  getBudgetOverview,
} from "@/lib/budget";
import { budgetComparabilityNote, budgetSeriesGap } from "@/lib/budget-notes";
import { getDatasetDate, getSourceById } from "@/lib/data";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return getBudgetOrganizations().map((organization) => ({ slug: organization.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const view = getBudgetByOrganizationSlug(slug);
  if (!view) return {};
  const year = view.currentRecord?.fiscalYear;
  const description =
    year !== undefined && year !== null
      ? `Begroting van ${view.organization.name} voor ${year}: uitgaven, ontvangsten en de reeks gerealiseerde bedragen, met een bron per cijfer.`
      : `Begroting van ${view.organization.name}: uitgaven en ontvangsten, met een bron per cijfer.`;
  return pageMetadata({
    title: `Begroting ${view.organization.name}`,
    description,
    path: `/begroting/${view.organization.slug}/`,
    snapshotDate: getDatasetDate(),
  });
}

export default async function BudgetOrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const view = getBudgetByOrganizationSlug(slug);
  if (!view) notFound();

  const figureSources = view.sources.flatMap((ref) => {
    const source = getSourceById(ref.source);
    return source ? [{ href: source.url, title: source.title, retrieved: source.retrieved }] : [];
  });
  const currentYear = view.currentRecord?.fiscalYear ?? null;
  const previousYear = currentYear !== null ? currentYear - 1 : null;
  const delta =
    view.current !== null && view.previous !== null
      ? budgetDelta(view.current.spendingBudget, view.previous.spendingBudget)
      : null;

  const note = budgetComparabilityNote(view.organization.id);
  const comparabilityNote =
    note === null
      ? null
      : {
          ...note,
          sourceRef: view.currentRecord?.sources.find((ref) => ref.source === note.sourceId) ?? null,
        };

  const seriesGapNote = budgetSeriesGap(view.organization.id);
  const seriesGap =
    seriesGapNote === null
      ? null
      : {
          ...seriesGapNote,
          sourceRef: view.records.flatMap((record) => record.sources).find((ref) => ref.source === seriesGapNote.sourceId) ?? null,
        };
  const overview = currentYear === BUDGET_OVERVIEW_YEAR ? getBudgetOverview() : null;
  const share = overview?.items.find((item) => item.organization.id === view.organization.id)?.sharePercent ?? null;
  const branchColor = branchColorVar(view.organization.branch);

  const pageUrl = absoluteUrl(`/begroting/${view.organization.slug}/`);
  const trendSeries = [{ id: view.organization.id, slug: view.organization.slug, name: view.organization.name, points: view.trend }];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: `Begroting ${view.organization.name} · ${SITE_NAME}`,
          description: `Begrotingscijfers van ${view.organization.name}, met bron en ophaaldatum per cijfer.`,
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb
        items={[
          { label: SITE_NAME, href: "/" },
          { label: <T area="common" k="navBudget" />, href: "/begroting/" },
          { label: <BudgetOrgName name={view.organization.name} variant="plain" /> },
        ]}
      />

      <header className="mt-4 border-b border-line pb-5" style={{ borderTop: `3px solid ${branchColor}`, paddingTop: "1rem" }}>
        <h1 className="flex items-start gap-3 text-2xl font-semibold leading-tight tracking-tight text-ink">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md"
            style={{ color: branchColor, backgroundColor: `color-mix(in srgb, ${branchColor} 16%, transparent)` }}
          >
            <MinistryIcon orgId={view.organization.id} size={24} />
          </span>
          <span className="min-w-0 pt-0.5">
            <BudgetOrgName
              name={view.organization.name}
              secondaryClassName="text-sm font-normal tracking-normal text-ink-muted"
            />
          </span>
        </h1>
        <p className="mt-1 ps-14">
          <Link
            href={`/organisaties/${view.organization.slug}/`}
            className="inline-flex min-h-11 items-center text-sm text-accent-text underline-offset-2 hover:underline"
          >
            <T area="news" k="budgetOrgActionLink" />
          </Link>
        </p>
      </header>

      <section aria-labelledby="bedragen-titel" className="border-b border-line py-6">
        <SectionHeading id="bedragen-titel" icon={Wallet}>
          {currentYear !== null ? (
            <T area="news" k="budgetFiguresHeadingYear" vars={{ year: currentYear }} />
          ) : (
            <T area="news" k="budgetFiguresHeading" />
          )}
          <SourceIcons sources={figureSources} className="ms-2 align-middle text-base" />
        </SectionHeading>
        {view.current !== null ? (
          <>
            <div className="@container mt-3">
              <dl className="grid grid-cols-2 gap-2 @[44rem]:grid-cols-4 @[44rem]:gap-3">
                <StatTile
                  icon={Wallet}
                  tone="sector-regering"
                  label={<T area="news" k="budgetSpendingLabel" />}
                  value={
                    view.current.spendingBudget !== null ? (
                      <Amount value={view.current.spendingBudget} unit={view.unit} />
                    ) : (
                      <span className="text-sm font-normal text-ink-faint">
                        <T area="news" k="budgetNotReported" />
                      </span>
                    )
                  }
                  extra={
                    delta !== null && previousYear !== null ? (
                      <ChangeIndicator
                        absolute={delta.absolute}
                        percent={delta.percent}
                        unit={view.unit}
                        since={previousYear}
                        labelKey="budgetChangeIndicatorLabel"
                        className="mt-1"
                      />
                    ) : undefined
                  }
                />
                <StatTile
                  icon={HandCoins}
                  tone="sector-decentraal-provinciaal"
                  label={<T area="news" k="budgetRevenueLabel" />}
                  value={
                    view.current.revenue !== null ? (
                      <Amount value={view.current.revenue} unit={view.unit} />
                    ) : (
                      <span className="text-sm font-normal text-ink-faint">
                        <T area="news" k="budgetNotReported" />
                      </span>
                    )
                  }
                />
                <StatTile
                  icon={Scale}
                  tone="sector-hoge-colleges"
                  label={<T area="news" k="budgetNetLabel" />}
                  value={
                    view.current.net !== null ? (
                      <Amount value={view.current.net} unit={view.unit} />
                    ) : (
                      <span className="text-sm font-normal text-ink-faint">
                        <T area="news" k="budgetNotReported" />
                      </span>
                    )
                  }
                />
                {share !== null && overview !== null ? (
                  <StatTile
                    icon={PieChart}
                    tone="sector-waterschap"
                    label={<T area="news" k="budgetShareChip" />}
                    value={<ShareLabel share={share} />}
                  />
                ) : null}
              </dl>
            </div>
            {comparabilityNote !== null ? (
              <details open className="group mt-3 rounded-md border border-line bg-surface-inset text-sm leading-relaxed text-ink-muted">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 font-medium text-ink [&::-webkit-details-marker]:hidden">
                  <DisclosureChevron />
                  <T area="news" k="budgetComparabilityHeading" />
                </summary>
                <div className="px-3 pb-2.5">
                  <p>
                    <L nl={comparabilityNote.nl} en={comparabilityNote.en} />
                  </p>
                  {comparabilityNote.sourceRef !== null ? (
                    <p className="mt-1.5 text-xs">
                      <SourceRow sourceRef={comparabilityNote.sourceRef} />
                    </p>
                  ) : null}
                </div>
              </details>
            ) : null}
          </>
        ) : (
          <div className="mt-3">
            <DictEmptyState titleKey="budgetNoFiguresTitle" descriptionKey="budgetNoFiguresDescription" />
          </div>
        )}
      </section>

      <section aria-labelledby="jaren-titel" className="border-b border-line py-6">
        <SectionHeading id="jaren-titel" icon={TrendingUp}>
          <T area="news" k="budgetTrendHeading" />
        </SectionHeading>
        <div className="mt-3">
          <BudgetTrendChart
            series={trendSeries}
            defaultId={view.organization.id}
            selectable={false}
            note={
              seriesGap !== null ? (
                <div className="mt-1 text-xs leading-relaxed text-ink-faint">
                  <p>
                    <L nl={seriesGap.nl} en={seriesGap.en} />
                  </p>
                  {seriesGap.sourceRef !== null ? (
                    <p className="mt-1">
                      <SourceRow sourceRef={seriesGap.sourceRef} />
                    </p>
                  ) : null}
                </div>
              ) : null
            }
          />
        </div>
      </section>

      {view.breakdown.length > 0 ? (
        <section aria-labelledby="uitsplitsing-titel" className="border-b border-line py-6">
          <SectionHeading id="uitsplitsing-titel" icon={Layers}>
            <T area="news" k="budgetBreakdownHeading" />
          </SectionHeading>
          <div className="mt-3">
            <BudgetBreakdown breakdown={view.breakdown} unit={view.unit} />
          </div>
        </section>
      ) : (
        <section aria-labelledby="uitsplitsing-titel" className="border-b border-line py-4">
          <h2 id="uitsplitsing-titel" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <LucideIcon icon={Layers} size={16} className="shrink-0 text-ink-muted" />
            <T area="news" k="budgetBreakdownHeading" />
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            <T area="news" k="budgetBreakdownEmptyTitle" />. <T area="news" k="budgetBreakdownEmptyDescription" />
          </p>
        </section>
      )}

      {view.current !== null ? (
        <section className="border-b border-line py-2">
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-accent-text [&::-webkit-details-marker]:hidden">
              <DisclosureChevron />
              <T area="news" k="budgetFiguresDetailsSummary" />
            </summary>
            <div className="space-y-5 pb-3">
              <BudgetYearFigures
                unit={view.unit}
                currentYear={currentYear ?? 0}
                previousYear={previousYear ?? 0}
                current={view.current}
                previous={view.previous}
              />
              <BudgetHistory history={view.history} unit={view.unit} />
            </div>
          </details>
        </section>
      ) : null}

      <SourceList sources={view.sources} title={<T area="news" k="budgetSourcesTitle" />} />
    </>
  );
}
