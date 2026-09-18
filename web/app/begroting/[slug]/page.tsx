import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { BudgetBreakdown } from "@/components/budget/budget-breakdown";
import { BudgetHistory } from "@/components/budget/budget-history";
import { BudgetYearFigures } from "@/components/budget/budget-year-figures";
import { ChangeIndicator } from "@/components/budget/change-indicator";
import { T } from "@/components/i18n/t";
import { EmptyState } from "@/components/empty-state";
import { JsonLd } from "@/components/json-ld";
import { SourceList } from "@/components/source-list";
import {
  budgetDelta,
  budgetUnitLabel,
  getBudgetByOrganizationSlug,
  getBudgetOrganizations,
} from "@/lib/budget";
import { getDatasetDate } from "@/lib/data";
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
      ? `Begroting van ${view.organization.name} voor ${year}: uitgaven, ontvangsten, saldo en de reeks gerealiseerde bedragen, met een bron per cijfer.`
      : `Begroting van ${view.organization.name}: uitgaven, ontvangsten en saldo, met een bron per cijfer.`;
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

  const unitLabel = budgetUnitLabel(view.unit);
  const currentYear = view.currentRecord?.fiscalYear ?? null;
  const previousYear = currentYear !== null ? currentYear - 1 : null;
  const delta =
    view.current !== null && view.previous !== null
      ? budgetDelta(view.current.spendingBudget, view.previous.spendingBudget)
      : null;

  const pageUrl = absoluteUrl(`/begroting/${view.organization.slug}/`);

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
          { label: "Begroting", href: "/begroting/" },
          { label: view.organization.name },
        ]}
      />

      <header className="mt-4 border-b border-line pb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-accent-text"><T area="news" k="budgetHeading" /></p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">          {view.organization.name}
        </h1>
        <p className="mt-2 text-sm">
          <Link
            href={`/organisaties/${view.organization.slug}/`}
            className="text-accent-text underline-offset-2 hover:underline"
          >
              <T area="news" k="budgetOrgActionLink" />
          </Link>
        </p>
        {unitLabel !== null ? (
          <p className="mt-2 text-xs text-ink-faint">
            <T area="news" k="budgetUnitNote" vars={{ unit: unitLabel }} />
          </p>
        ) : null}
        {currentYear !== null && previousYear !== null ? (
          <p className="mt-1 text-xs text-ink-faint">
            Vergelijking van {currentYear} met {previousYear}.
          </p>
        ) : null}
      </header>

      {view.current !== null ? (
        <section aria-labelledby="bedragen-titel" className="border-b border-line py-6">
          <h2 id="bedragen-titel" className="text-lg font-semibold tracking-tight text-ink">
              <T area="news" k="budgetFiguresHeading" />
          </h2>
          {currentYear !== null && previousYear !== null ? (
            delta !== null ? (
              <ChangeIndicator
                delta={delta}
                unit={view.unit}
                since={String(previousYear)}
                label="de begrote uitgaven"
              />
            ) : null
          ) : null}
          <div className="mt-3">
            <BudgetYearFigures
              unit={view.unit}
              currentYear={currentYear ?? 0}
              previousYear={previousYear ?? 0}
              current={view.current}
              previous={view.previous}
              sources={view.sources}
            />
          </div>
        </section>
      ) : (
        <section aria-labelledby="bedragen-titel" className="border-b border-line py-6">
          <h2 id="bedragen-titel" className="text-lg font-semibold tracking-tight text-ink">
              <T area="news" k="budgetFiguresHeading" />
          </h2>
          <div className="mt-3">
            <EmptyState
              title="Geen bedragen beschikbaar"
              description="De bron bevat voor deze organisatie nog geen begrote uitgaven, ontvangsten of saldo."
            />
          </div>
        </section>
      )}

      <section aria-labelledby="reeks-titel" className="border-b border-line py-6">
        <h2 id="reeks-titel" className="text-lg font-semibold tracking-tight text-ink">
            <T area="news" k="budgetHistoryHeading" />
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          De werkelijke uitgaven en ontvangsten per jaar zoals de begrotingsstaten die melden.
        </p>
        <div className="mt-3">
          <BudgetHistory history={view.history} unit={view.unit} sources={view.sources} />
        </div>
      </section>

      <section aria-labelledby="uitsplitsing-titel" className="border-b border-line py-6">
        <h2 id="uitsplitsing-titel" className="text-lg font-semibold tracking-tight text-ink">
            <T area="news" k="budgetBreakdownHeading" />
        </h2>
        <div className="mt-3">
          <BudgetBreakdown
            breakdown={view.breakdown}
            unit={view.unit}
            fiscalYear={currentYear}
            sources={view.currentRecord?.sources ?? []}
          />
        </div>
      </section>

      <SourceList sources={view.sources} title="Bronnen en ophaaldata" />
    </>
  );
}
