import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, type BreadcrumbItem } from "@/components/breadcrumb";
import { EmptyStateT } from "@/components/change/empty-state-t";
import { EntityTabs } from "@/components/entity-tabs";
import { JsonLd } from "@/components/json-ld";
import { KindBadge } from "@/components/kind-badge";
import { PersonCard } from "@/components/person-card";
import { SourceLink } from "@/components/source-link";
import { ShareButton } from "@/components/share-button";
import { DateT } from "@/components/content/local-date";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { SourceList } from "@/components/source-list";
import { NewsPanel } from "@/components/news/news-panel";
import { L, T } from "@/components/i18n/t";
import { POSITION_TYPE_LABELS } from "@/lib/labels";
import { EntityConnections } from "@/components/entity/entity-connections";
import { EntityFacts } from "@/components/entity/entity-facts";
import { FactGroup } from "@/components/entity/fact-group";
import { HistoryIcon, PeopleIcon, SeatIcon } from "@/components/entity/icons";
import { TenureTimeline } from "@/components/entity/tenure-timeline";
import {
  getDatasetDate,
  getOrganizationById,
  getPersonById,
  getPositionBySlug,
  getPositions,
  getSourceById,
  getTenuresForPosition,
} from "@/lib/data";
import {
  getConnectionsForEntity,
  getCurrentHoldersForPosition,
  positionEntryModes,
  positionExOfficioOf,
} from "@/lib/entity";
import { getNewsForEntity } from "@/lib/news";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { Organization, Position } from "@/lib/types";
import type { Connection } from "@/lib/entity";

export const dynamicParams = false;

const ambiguousPositionTitles = (() => {
  const counts = new Map<string, number>();
  for (const item of getPositions()) {
    counts.set(item.title, (counts.get(item.title) ?? 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([title]) => title),
  );
})();

function positionMetadataTitle(position: Position): string {
  if (!ambiguousPositionTitles.has(position.title)) return position.title;
  const organization = getOrganizationById(position.organization);
  if (!organization) return position.title;
  const parent =
    position.type === "commission" && organization.parent
      ? getOrganizationById(organization.parent)
      : undefined;
  const context = parent ?? organization;
  const contextName =
    context.subtype === "gemeente" ? context.name.replace(/^Gemeente\s+/, "") : context.name;
  if (position.title.includes(contextName)) return position.title;
  return `${position.title} van ${contextName}`;
}

export function generateStaticParams() {
  return getPositions().map((position) => ({ slug: position.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const position = getPositionBySlug(slug);
  if (!position) return {};
  const organization = getOrganizationById(position.organization);
  const description =
    organization !== undefined
      ? `${position.title} bij ${organization.name}: wettelijke basis en de reeks bekende functionarissen, met bron per gegeven.`
      : `${position.title}: wettelijke basis en de reeks bekende functionarissen, met bron per gegeven.`;
  return pageMetadata({
    title: positionMetadataTitle(position),
    description,
    path: `/posities/${position.slug}/`,
    snapshotDate: getDatasetDate(),
  });
}

/** Term length in the site language: "4 jaar" or "4 years". */
function TermLength({ months }: { months: number }) {
  if (months % 12 === 0) {
    const years = months / 12;
    return <DateT area="entity" k={years === 1 ? "termYearOne" : "termYears"} counts={{ n: years }} />;
  }
  return <DateT area="entity" k={months === 1 ? "termMonthOne" : "termMonths"} counts={{ n: months }} />;
}

export default async function PositionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const position = getPositionBySlug(slug);
  if (!position) notFound();

  const organization = getOrganizationById(position.organization);
  const currentHolders = getCurrentHoldersForPosition(position.id);
  const tenures = getTenuresForPosition(position.id);
  const news = getNewsForEntity(position.id);
  const connections: Connection[] = getConnectionsForEntity(position.id);

  const legalBasis = position.legalBasis ?? null;
  const fillMethod = position.fillMethod ?? null;
  const termLength = position.termLengthMonths ?? null;
  const seatsCount = position.seatsCount ?? null;
  const entryModes = positionEntryModes(position);

  const exOfficio = positionExOfficioOf(position)
    .map((id) => getOrganizationById(id))
    .filter((item): item is Organization => item !== undefined);

  const entryModeLabel =
    entryModes.length > 0
      ? entryModes.map((mode, index) => (
          <span key={mode}>
            {index > 0 ? ", " : null}
            <LocaleLabel kind="entryMode" value={mode} />
          </span>
        ))
      : null;

  const facts = [
    {
      label: <T area="entity" k="factOrganization" />,
      value: organization ? <EntityPeekLink id={organization.id} /> : null,
    },
    {
      label: <T area="entity" k="factType" />,
      value: <L {...POSITION_TYPE_LABELS[position.type]} />,
    },
    {
      label: <T area="entity" k="factFillMethod" />,
      value: fillMethod !== null ? <LocaleLabel kind="fillMethod" value={fillMethod} /> : null,
    },
    {
      label: <T area="entity" k="factTermLength" />,
      value: termLength !== null ? <TermLength months={termLength} /> : null,
    },
    {
      label: <T area="entity" k="factSeats" />,
      value: seatsCount !== null ? <DateT area="entity" k="countOnly" counts={{ n: seatsCount }} /> : null,
    },
    {
      label: <T area="entity" k="factEntryModes" />,
      value: entryModeLabel,
    },
  ];

  const breadcrumbItems: BreadcrumbItem[] = [{ label: SITE_NAME, href: "/" }];
  if (organization) {
    breadcrumbItems.push({ label: organization.name, href: `/organisaties/${organization.slug}/` });
  }
  breadcrumbItems.push({ label: position.title });

  const organizationUrl = organization
    ? absoluteUrl(`/organisaties/${organization.slug}/`)
    : undefined;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Occupation",
          name: position.title,
          ...(organization
            ? {
                occupationLocation: {
                  "@type": "GovernmentOrganization",
                  name: organization.name,
                  ...(organizationUrl !== undefined ? { url: organizationUrl } : {}),
                },
              }
            : {}),
        }}
      />

      <Breadcrumb items={breadcrumbItems} />

      <header className="mt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <KindBadge tone="accent">
            <L {...POSITION_TYPE_LABELS[position.type]} />
          </KindBadge>
          {fillMethod !== null ? (
            <span className="inline-flex items-center rounded-pill border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-muted">
              <LocaleLabel kind="fillMethod" value={fillMethod} />
            </span>
          ) : null}
          {seatsCount !== null ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-muted">
              <SeatIcon width={13} height={13} />
              <DateT area="entity" k={seatsCount === 1 ? "seatOne" : "seatMany"} counts={{ n: seatsCount }} />
            </span>
          ) : null}
          <ShareButton className="ms-auto" title={position.title} />
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-ink">{position.title}</h1>
        {organization ? (
          <p className="mt-2 text-sm text-ink-muted">
            <T area="entity" k="factOrganization" />: <EntityPeekLink id={organization.id} glyph />
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {legalBasis !== null ? (
            <SourceLink href={legalBasis.url}>
              <T area="entity" k="legalBasisLabel" />: {legalBasis.label}
            </SourceLink>
          ) : (
            <span className="text-xs text-ink-faint">
              <T area="entity" k="noLegalBasisLabel" />
            </span>
          )}
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 items-start gap-4">
        <div className="min-w-0 space-y-4">
          <EntityTabs
            news={
              <div>
                <h2 id="nieuws-paneel-titel" className="text-base font-semibold tracking-tight text-ink">
                  <T area="entity" k="tabNews" />
                </h2>
                {news.length > 0 ? (
                  <div className="mt-3">
                    <NewsPanel scope="custom" items={news} initialLimit={4} />
                  </div>
                ) : (
                  <div className="mt-3">
                    <EmptyStateT
                      area="entity"
                      title="newsEmptyTitle"
                      description="newsEmptyNote"
                      descriptionVars={{ name: position.title }}
                    />
                  </div>
                )}
              </div>
            }
            connections={
              <div>
                <h2
                  id="verbindingen-paneel-titel"
                  className="text-base font-semibold tracking-tight text-ink"
                >
                  <T area="entity" k="whosConnected" />
                </h2>
                <div className="mt-3">
                  <EntityConnections connections={connections} selfId={position.organization} />
                </div>
              </div>
            }
          />

          <FactGroup icon={<PeopleIcon />} title={<T area="entity" k="currentOfficials" />} count={currentHolders.length > 0 ? currentHolders.length : undefined}>
            {currentHolders.length > 0 ? (
              <>
                {seatsCount !== null ? (
                  <p className="text-sm tabular-nums text-ink-muted">
                    <T
                      area="entity"
                      k={seatsCount === 1 ? "seatsFilledOne" : "seatsFilled"}
                      vars={{ n: currentHolders.length, total: seatsCount }}
                    />
                  </p>
                ) : null}
                <ul className="mt-1 divide-y divide-line/60">
                  {currentHolders.map((tenure) => {
                    const person = getPersonById(tenure.person);
                    const source = getSourceById(tenure.source.source);
                    if (!person) return null;
                    return (
                      <li key={tenure.id}>
                        <PersonCard
                          person={person}
                          startedAt={tenure.start}
                          acting={tenure.acting}
                          source={
                            source ? (
                              <SourceLink href={source.url} meta={source.publisher} tone="quiet">
                                <T area="entity" k="sourceLabel" />
                              </SourceLink>
                            ) : null
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <EmptyStateT
                area="entity"
                title="vacancyTitle"
                description="vacancyNote"
              />
            )}
          </FactGroup>

          <FactGroup icon={<HistoryIcon />} title={<T area="entity" k="tenureHistoryTitle" />} count={tenures.length > 0 ? tenures.length : undefined}>
            {tenures.length > 0 ? (
              <TenureTimeline tenures={tenures} variant="position" labelKey="tenureHistoryTitle" />
            ) : (
              <EmptyStateT
                area="entity"
                title="noHoldersTitle"
                description="noHoldersNote"
              />
            )}
          </FactGroup>
        </div>

        <aside className="order-first min-w-0 space-y-4">
          <EntityFacts facts={facts} className="rounded-md border border-line bg-surface p-4" />

          {exOfficio.length > 0 ? (
            <FactGroup icon={<SeatIcon />} title={<T area="entity" k="exOfficioTitle" />} count={exOfficio.length}>
              <p className="text-sm text-ink-muted">
                <T area="entity" k="exOfficioNote" />
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {exOfficio.map((item) => (
                  <li key={item.id}>
                    <EntityPeekLink id={item.id} glyph />
                  </li>
                ))}
              </ul>
            </FactGroup>
          ) : null}
        </aside>
      </div>

      <SourceList sources={position.sources} />
    </>
  );
}
