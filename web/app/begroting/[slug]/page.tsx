import type { Metadata } from "next";
import { Layers, Wallet } from "lucide";
import { SectionHeading } from "@/components/icons/section-heading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { BudgetBreakdown } from "@/components/budget/budget-breakdown";
import { BudgetHistory } from "@/components/budget/budget-history";
import { BudgetOrgName } from "@/components/budget/budget-org-name";
import { BudgetYearFigures } from "@/components/budget/budget-year-figures";
import { ChangeIndicator } from "@/components/budget/change-indicator";
import { L, T } from "@/components/i18n/t";
import { DictEmptyState } from "@/components/budget/dict-empty-state";
import { JsonLd } from "@/components/json-ld";
import { SourceList, SourceRow } from "@/components/source-list";
import { SourceIcons } from "@/components/source-icon";
import {
  budgetDelta,
  getBudgetByOrganizationSlug,
  getBudgetOrganizations,
} from "@/lib/budget";
import { budgetComparabilityNote } from "@/lib/budget-notes";
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
          { label: <T area="common" k="navBudget" />, href: "/begroting/" },
          { label: <BudgetOrgName name={view.organization.name} variant="plain" /> },
        ]}
      />

      <header className="mt-4 border-b border-line pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          <BudgetOrgName
            name={view.organization.name}
            secondaryClassName="text-sm font-normal tracking-normal text-ink-muted"
          />
        </h1>
        <p className="mt-1">
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
            {delta !== null && previousYear !== null ? (
              <ChangeIndicator
                absolute={delta.absolute}
                percent={delta.percent}
                unit={view.unit}
                since={previousYear}
                labelKey="budgetChangeIndicatorLabel"
              />
            ) : null}
            {comparabilityNote !== null ? (
              <aside className="mt-3 rounded-md border border-line bg-surface-inset px-3 py-2.5 text-sm leading-relaxed text-ink-muted">
                <p className="font-medium text-ink">
                  <T area="news" k="budgetComparabilityHeading" />
                </p>
                <p className="mt-1">
                  <L nl={comparabilityNote.nl} en={comparabilityNote.en} />
                </p>
                {comparabilityNote.sourceRef !== null ? (
                  <p className="mt-1.5 text-xs">
                    <SourceRow sourceRef={comparabilityNote.sourceRef} />
                  </p>
                ) : null}
              </aside>
            ) : null}
            <div className="mt-3">
              <BudgetYearFigures
                unit={view.unit}
                currentYear={currentYear ?? 0}
                previousYear={previousYear ?? 0}
                current={view.current}
                previous={view.previous}
              />
            </div>
          </>
        ) : (
          <div className="mt-3">
            <DictEmptyState titleKey="budgetNoFiguresTitle" descriptionKey="budgetNoFiguresDescription" />
          </div>
        )}
      </section>

      <section className="border-b border-line py-3">
        <BudgetHistory history={view.history} unit={view.unit} />
      </section>

      <section aria-labelledby="uitsplitsing-titel" className="border-b border-line py-6">
        <SectionHeading id="uitsplitsing-titel" icon={Layers}>
            <T area="news" k="budgetBreakdownHeading" />
        </SectionHeading>
        <div className="mt-3">
          <BudgetBreakdown
            breakdown={view.breakdown}
            unit={view.unit}
          />
        </div>
      </section>

      <SourceList sources={view.sources} title={<T area="news" k="budgetSourcesTitle" />} />
    </>
  );
}
