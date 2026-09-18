import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyStateT } from "@/components/change/empty-state-t";
import { EntityChip } from "@/components/entity-chip";
import { EntityTabs } from "@/components/entity-tabs";
import { JsonLd } from "@/components/json-ld";
import { PartyBadge } from "@/components/party-badge";
import { SourceLink } from "@/components/source-link";
import { SourceList } from "@/components/source-list";
import { NewsPanel } from "@/components/news/news-panel";
import { T } from "@/components/i18n/t";
import { type TimelineItem } from "@/components/timeline";
import { TimelineT } from "@/components/entity/timeline-t";
import { EntityConnections } from "@/components/entity/entity-connections";
import { EntityDot } from "@/components/entity/entity-dot";
import { EntityFacts } from "@/components/entity/entity-facts";
import { FactGroup } from "@/components/entity/fact-group";
import { HistoryIcon, PeopleIcon, PersonIcon, SeatIcon } from "@/components/entity/icons";
import { PersonPortrait } from "@/components/entity/person-portrait";
import { TenureTimeline } from "@/components/entity/tenure-timeline";
import {
  getMembershipsForPerson,
  getDatasetDate,
  getOrganizationById,
  getPeople,
  getPersonBySlug,
  getPositionById,
  getSourceById,
  getTenuresForPerson,
} from "@/lib/data";
import {
  getConnectionsForEntity,
  getMediaItem,
  mediaCreditLine,
  personBirthDate,
  personDescription,
  personParty,
  personPortraitId,
} from "@/lib/entity";
import { formatDate, formatPeriod } from "@/lib/format";
import { getNewsForEntity } from "@/lib/news";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { Organization } from "@/lib/types";
import type { Connection } from "@/lib/entity";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPeople().map((person) => ({ slug: person.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const person = getPersonBySlug(slug);
  if (!person) return {};
  const role =
    getTenuresForPerson(person.id)
      .map((tenure) => getPositionById(tenure.position)?.title)
      .filter((title): title is string => title !== undefined)[0] ?? null;
  const description =
    person.description ??
    (role !== null
      ? `${person.name} is ${role.charAt(0).toLowerCase()}${role.slice(1)}. Bekijk de functies, lidmaatschappen en bronnen.`
      : `Functies, lidmaatschappen en bronnen van ${person.name}.`);
  return pageMetadata({
    title: person.name,
    description,
    path: `/personen/${person.slug}/`,
    snapshotDate: getDatasetDate(),
  });
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = getPersonBySlug(slug);
  if (!person) notFound();

  const tenures = getTenuresForPerson(person.id);
  const memberships = getMembershipsForPerson(person.id);
  const connections: Connection[] = getConnectionsForEntity(person.id);
  const news = getNewsForEntity(person.id);

  const party = personParty(person);
  const birthDate = personBirthDate(person);
  const description = personDescription(person);
  const portrait = getMediaItem(personPortraitId(person));

  const currentTenures = tenures.filter((tenure) => tenure.end === null);

  const membershipItems: TimelineItem[] = memberships.map((membership) => {
    const organization = getOrganizationById(membership.organization);
    const source = getSourceById(membership.source.source);
    const badges: string[] = [];
    if (membership.fractie !== null) badges.push(membership.fractie);
    if (membership.seatNumber !== null) badges.push(`Zetel ${membership.seatNumber}`);
    return {
      id: membership.id,
      title: organization ? (
        <Link
          href={`/organisaties/${organization.slug}/`}
          className="underline-offset-2 hover:text-accent-text hover:underline"
        >
          {organization.name}
        </Link>
      ) : (
        <T area="entity" k="unknownOrganization" />
      ),
      meta: (
        <span className="inline-flex flex-wrap items-baseline gap-x-2">
          <span>
            <T area="entity" k="membershipMeta" />
          </span>
          {source ? (
            <SourceLink href={source.url} meta={source.publisher}>
              <T area="entity" k="sourceLabel" />
            </SourceLink>
          ) : null}
        </span>
      ),
      period: formatPeriod(membership.start, membership.end),
      current: membership.end === null,
      badges,
    };
  });

  const currentTitles = currentTenures
    .map((tenure) => getPositionById(tenure.position)?.title)
    .filter((title): title is string => title !== undefined);

  const currentOrganizationIds = new Set<string>();
  for (const tenure of currentTenures) {
    const position = getPositionById(tenure.position);
    if (position !== undefined) currentOrganizationIds.add(position.organization);
  }
  for (const membership of memberships) {
    if (membership.end !== null) continue;
    currentOrganizationIds.add(membership.organization);
  }
  const currentOrganizations: Organization[] = [...currentOrganizationIds]
    .map((id) => getOrganizationById(id))
    .filter((item): item is Organization => item !== undefined);

  const pageUrl = absoluteUrl(`/personen/${person.slug}/`);
  const sameAs = [
    person.wikipedia,
    person.wikidata !== null ? `https://www.wikidata.org/wiki/${person.wikidata}` : null,
  ].filter((value): value is string => value !== null);

  const facts = [
    {
      label: <T area="entity" k="factParty" />,
      value: party !== null ? <PartyBadge party={party} /> : null,
    },
    {
      label: <T area="entity" k="factBorn" />,
      value: birthDate !== null ? <time dateTime={birthDate}>{formatDate(birthDate)}</time> : null,
    },
    {
      label: <T area="entity" k="factWikipedia" />,
      value:
        person.wikipedia != null ? (
          <SourceLink href={person.wikipedia}>Wikipedia</SourceLink>
        ) : null,
    },
    {
      label: <T area="entity" k="factWikidata" />,
      value:
        person.wikidata != null ? (
          <SourceLink href={`https://www.wikidata.org/wiki/${person.wikidata}`}>
            {person.wikidata}
          </SourceLink>
        ) : null,
    },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: person.name,
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
          ...(currentTitles.length > 0 ? { jobTitle: currentTitles } : {}),
          ...(birthDate !== null ? { birthDate } : {}),
          ...(currentOrganizations.length > 0
            ? {
                worksFor: currentOrganizations.map((organization) => ({
                  "@type": "GovernmentOrganization",
                  name: organization.name,
                })),
              }
            : {}),
          ...(sameAs.length > 0 ? { sameAs } : {}),
        }}
      />

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: person.name }]} />

      <header className="mt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="shrink-0">
            <div className="rounded-md border border-line bg-surface p-3">
              <PersonPortrait person={person} size={96} className="mx-auto" />
            </div>
            {portrait !== null ? (
              <p className="mt-2 max-w-[96px] text-xs leading-snug text-ink-faint">
                <T area="entity" k="imageCredit" />: {mediaCreditLine(portrait)}
              </p>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                <EntityDot kind="person" id={person.id} />
                <PersonIcon width={13} height={13} />
                <T area="entity" k="personChip" />
              </span>
              {party !== null ? (
                <span className="inline-flex items-center rounded-pill border border-line bg-surface px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  <PartyBadge party={party} />
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{person.name}</h1>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
              {description !== null ? (
                description
              ) : (
                <T area="entity" k="personNoDescription" vars={{ name: person.name }} />
              )}
            </p>
            {currentTitles.length > 0 ? (
              <p className="mt-2 flex flex-wrap gap-2 text-sm text-ink">
                <span className="font-semibold"><T area="entity" k="rolesTitle" />:</span>
                {currentTitles.map((title) => (
                  <span key={title} className="text-ink-muted">
                    {title}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
                      descriptionVars={{ name: person.name }}
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

          {tenures.length > 0 ? (
            <FactGroup icon={<HistoryIcon />} title={<T area="entity" k="rolesTitle" />} count={tenures.length}>
              <TenureTimeline tenures={tenures} variant="person" labelKey="rolesTitle" />
            </FactGroup>
          ) : null}

          {memberships.length > 0 ? (
            <FactGroup icon={<SeatIcon />} title={<T area="entity" k="membershipsTitle" />} count={memberships.length}>
              <TimelineT items={membershipItems} labelKey="membershipsTitle" />
            </FactGroup>
          ) : null}

          {tenures.length === 0 && memberships.length === 0 ? (
            <FactGroup icon={<PeopleIcon />} title={<T area="entity" k="rolesTitle" />}>
              <EmptyStateT
                area="entity"
                title="noRoleTitle"
                description="noRoleNote"
                descriptionVars={{ name: person.name }}
              />
            </FactGroup>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-4">
          <EntityFacts facts={facts} className="rounded-md border border-line bg-surface p-4" />

          {currentOrganizations.length > 0 ? (
            <FactGroup title={<T area="entity" k="rolesNowTitle" />}>
              <ul className="flex flex-wrap gap-2">
                {currentOrganizations.map((organization) => (
                  <li key={organization.id}>
                    <EntityChip
                      href={`/organisaties/${organization.slug}/`}
                      dot={<EntityDot kind="organization" id={organization.id} />}
                    >
                      {organization.name}
                    </EntityChip>
                  </li>
                ))}
              </ul>
            </FactGroup>
          ) : null}
        </aside>
      </div>

      <SourceList sources={person.sources} />
    </>
  );
}
