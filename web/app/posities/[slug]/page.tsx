import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, type BreadcrumbItem } from "@/components/breadcrumb";
import { EmptyStateT } from "@/components/change/empty-state-t";
import { EntityChip } from "@/components/entity-chip";
import { EntityTabs } from "@/components/entity-tabs";
import { JsonLd } from "@/components/json-ld";
import { KindBadge } from "@/components/kind-badge";
import { PersonCard } from "@/components/person-card";
import { SourceLink } from "@/components/source-link";
import { SourceList } from "@/components/source-list";
import { NewsPanel } from "@/components/news/news-panel";
import { T } from "@/components/i18n/t";
import { EntityConnections } from "@/components/entity/entity-connections";
import { EntityDot } from "@/components/entity/entity-dot";
import { EntityFacts } from "@/components/entity/entity-facts";
import { FactGroup } from "@/components/entity/fact-group";
import { ClipboardIcon, HistoryIcon, PeopleIcon, SeatIcon } from "@/components/entity/icons";
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
  formatTermLength,
  getConnectionsForEntity,
  getCurrentHoldersForPosition,
  positionEntryModes,
  positionExOfficioOf,
} from "@/lib/entity";
import { formatCount } from "@/lib/format";
import { getNewsForEntity } from "@/lib/news";
import {
  ENTRY_MODE_LABELS,
  FILL_METHOD_LABELS,
  ORG_TYPE_LABELS,
} from "@/lib/labels";
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
      ? entryModes
          .map((mode) => ENTRY_MODE_LABELS[mode])
          .filter((label): label is string => label !== undefined)
          .join(", ")
      : null;

  const facts = [
    {
      label: <T area="entity" k="factOrganization" />,
      value: organization ? organization.name : null,
    },
    {
      label: <T area="entity" k="factType" />,
      value: ORG_TYPE_LABELS[position.type],
    },
    {
      label: <T area="entity" k="factFillMethod" />,
      value: fillMethod !== null ? FILL_METHOD_LABELS[fillMethod] : null,
    },
    {
      label: <T area="entity" k="factTermLength" />,
      value: termLength !== null ? formatTermLength(termLength) : null,
    },
    {
      label: <T area="entity" k="factSeats" />,
      value: seatsCount !== null ? formatCount(seatsCount) : null,
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
          <KindBadge tone="accent">{ORG_TYPE_LABELS[position.type]}</KindBadge>
          {fillMethod !== null ? (
            <span className="inline-flex items-center rounded-pill border border-line bg-surface px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
              {FILL_METHOD_LABELS[fillMethod]}
            </span>
          ) : null}
          {seatsCount !== null ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
              <SeatIcon width={13} height={13} />
              {formatCount(seatsCount)} <T area="entity" k="holderMeta" />
            </span>
          ) : null}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{position.title}</h1>
        {organization ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
            <EntityDot kind="position" id={position.id} />
            <T area="entity" k="factOrganization" />:{" "}
            <a
              href={`/organisaties/${organization.slug}/`}
              className="underline-offset-2 hover:text-accent-text hover:underline"
            >
              {organization.name}
            </a>
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
                  <EntityConnections connections={connections} />
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
                      area="common"
                      k="seatsCountLabel"
                      vars={{ n: currentHolders.length, total: seatsCount }}
                    />
                  </p>
                ) : null}
                <ul className="mt-3 space-y-2">
                  {currentHolders.map((tenure) => {
                    const person = getPersonById(tenure.person);
                    const source = getSourceById(tenure.source.source);
                    if (!person) return null;
                    return (
                      <li key={tenure.id} className="space-y-1">
                        <PersonCard
                          person={person}
                          positionTitle={organization?.name ?? null}
                          startedAt={tenure.start}
                          acting={tenure.acting}
                        />
                        {source ? (
                          <p className="pl-1">
                            <SourceLink href={source.url} meta={source.publisher}>
                              <T area="entity" k="sourceLabel" />
                            </SourceLink>
                          </p>
                        ) : null}
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

          <FactGroup title={<T area="entity" k="factOrganization" />}>
            {organization ? (
              <EntityChip
                href={`/organisaties/${organization.slug}/`}
                dot={<EntityDot kind="organization" id={organization.id} />}
              >
                {organization.name}
              </EntityChip>
            ) : (
              <p className="text-sm text-ink-faint">
                <T area="entity" k="unknownOrganization" />.
              </p>
            )}
          </FactGroup>

          {exOfficio.length > 0 ? (
            <FactGroup icon={<SeatIcon />} title={<T area="entity" k="exOfficioTitle" />} count={exOfficio.length}>
              <p className="text-sm text-ink-muted">
                <T area="entity" k="exOfficioNote" />
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {exOfficio.map((item) => (
                  <li key={item.id}>
                    <EntityChip
                      href={`/organisaties/${item.slug}/`}
                      dot={<EntityDot kind="organization" id={item.id} />}
                    >
                      {item.name}
                    </EntityChip>
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
