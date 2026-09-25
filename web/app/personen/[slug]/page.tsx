import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { EntityTabs } from "@/components/entity-tabs";
import { JsonLd } from "@/components/json-ld";
import { PartyBadge } from "@/components/party-badge";
import { DateT, LocalPeriod } from "@/components/content/local-date";
import { SourceLink } from "@/components/source-link";
import { SourceList } from "@/components/source-list";
import { SourceIcon } from "@/components/source-icon";
import { NewsPanel } from "@/components/news/news-panel";
import { Gloss, L, T } from "@/components/i18n/t";
import { positionEn } from "@/lib/name-gloss";
import { ShareButton } from "@/components/share-button";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { MembershipList } from "@/components/entity/membership-list";
import { EntityConnections } from "@/components/entity/entity-connections";
import { Callout } from "@/components/entity/callout";
import { CareerTimeline } from "@/components/entity/career-timeline";
import { FactTiles, type FactTile } from "@/components/entity/fact-tiles";
import { FactGroup } from "@/components/entity/fact-group";
import { BriefcaseIcon, CalendarIcon, HistoryIcon, LinkIcon, PeopleIcon, SeatIcon } from "@/components/entity/icons";
import { LocalizedDescription } from "@/components/entity/localized-description";
import { PersonActivity } from "@/components/entity/person-activity";
import { PersonBirth } from "@/components/entity/person-birth";
import { PersonPortrait, PersonPortraitCredit } from "@/components/entity/person-portrait";
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
import { getPersonActivityView } from "@/lib/activities";
import { getCareerForPerson } from "@/lib/careers";
import { descriptionFor } from "@/lib/description-translations";
import { personSummary } from "@/lib/entity-summary";
import {
  getConnectionsForEntity,
  personBirthDate,
  personParty,
} from "@/lib/entity";
import { getNewsForEntity } from "@/lib/news";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { Organization, Person, Source } from "@/lib/types";
import type { Connection } from "@/lib/entity";

export const dynamicParams = false;

/**
 * The source record that gave the birth date: the TK or EK member list the
 * seed read it from, else the person's Wikidata record. Null when none of the
 * listed sources is one of those.
 */
function birthDateSource(person: Person): Source | null {
  const order = [/^src:tk-odata-personen$/, /^src:ek-alle-leden$/, /^src:ek-persoon-/, /^src:wikidata-/];
  for (const pattern of order) {
    const ref = person.sources.find((entry) => pattern.test(entry.source));
    const source = ref !== undefined ? getSourceById(ref.source) : undefined;
    if (source !== undefined) return source;
  }
  return null;
}

/** Current roles listed in the header; the rest are in the Positions section. */
const HEADER_ROLE_LIMIT = 4;

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
    personSummary(person)?.nl ??
    descriptionFor(person.id, person.description)?.nl ??
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
  const activity = getPersonActivityView(person.id);

  const party = personParty(person);
  const birthDate = personBirthDate(person);
  const description = descriptionFor(person.id, person.description);
  const summary = personSummary(person);
  const career = getCareerForPerson(person.id);
  const careerCount = career.reduce((sum, group) => sum + group.items.length, 0);
  const birthSource = birthDate !== null ? birthDateSource(person) : null;

  const currentTenures = tenures.filter((tenure) => tenure.end === null);

  const currentPositions = currentTenures
    .map((tenure) => getPositionById(tenure.position))
    .filter((position) => position !== undefined);
  const currentTitles = currentPositions.map((position) => position.title);

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

  const actingTenures = currentTenures.filter((tenure) => tenure.acting);

  const facts: FactTile[] = [
    {
      key: "party",
      icon: <PeopleIcon />,
      label: <T area="entity" k="factParty" />,
      value: party !== null ? <PartyBadge party={party} /> : null,
    },
    {
      key: "born",
      icon: <CalendarIcon />,
      label: <T area="entity" k="factBorn" />,
      value:
        birthDate !== null ? (
          <span className="inline-flex flex-wrap items-center gap-x-1.5">
            <PersonBirth iso={birthDate} />
            {birthSource !== null ? (
              <SourceIcon href={birthSource.url} title={birthSource.title} retrieved={birthSource.retrieved} />
            ) : null}
          </span>
        ) : null,
    },
    {
      key: "links",
      icon: <LinkIcon />,
      label: <T area="entity" k="factLinks" />,
      value:
        person.wikipedia != null || person.wikidata != null ? (
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {person.wikipedia != null ? <SourceLink href={person.wikipedia}>Wikipedia</SourceLink> : null}
            {person.wikidata != null ? (
              <SourceLink href={`https://www.wikidata.org/wiki/${person.wikidata}`}>Wikidata</SourceLink>
            ) : null}
          </span>
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="shrink-0">
            <div className="relative inline-block">
              <PersonPortrait person={person} size={96} labelled morph />
              <span className="absolute -bottom-1 -right-1">
                <PersonPortraitCredit person={person} variant="info" />
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start gap-3">
              <h1 className="min-w-0 flex-1 text-3xl font-semibold tracking-tight text-balance text-ink break-words">
                {person.name}
              </h1>
              <ShareButton className="mt-1 shrink-0" title={person.name} />
            </div>
            {summary !== null ? (
              <p className="mt-2 max-w-prose text-base leading-snug text-ink-muted">
                <L nl={summary.nl} en={summary.en} />
              </p>
            ) : null}
            {actingTenures.length > 0 ? (
              <div className="mt-3 space-y-2">
                {actingTenures.slice(0, 2).map((tenure) => {
                  const position = getPositionById(tenure.position);
                  if (!position) return null;
                  return (
                    <Callout key={tenure.id}>
                      <DateT area="entity" k="actingCallout" vars={{ title: position.title }} />{" "}
                      <span className="text-ink-muted">
                        (<LocalPeriod start={tenure.start} end={null} />)
                      </span>
                    </Callout>
                  );
                })}
              </div>
            ) : null}
            {/* A single current role is already the summary line; list roles only when there are more. */}
            {currentPositions.length > 1 || (currentPositions.length === 1 && (summary === null || !summary.nl.includes(currentPositions[0].title))) ? (
              <div className="mt-3 text-sm">
                <p className="text-xs text-ink-faint">
                  <T area="entity" k="rolesNowLabel" />
                </p>
                <ul className="mt-1 space-y-1">
                  {currentPositions.slice(0, HEADER_ROLE_LIMIT).map((position) => {
                    const organization = getOrganizationById(position.organization);
                    // "Lid Vaste commissie voor X" already names its body; do not repeat it.
                    const namesBody =
                      organization !== undefined &&
                      position.title.toLowerCase().includes(organization.name.toLowerCase());
                    return (
                      <li key={position.id} className="text-ink-muted">
                        <EntityPeekLink id={position.id} glyph>
                          {position.title}
                        </EntityPeekLink>
                        <Gloss text={positionEn(position.title)} className="ms-1 text-xs text-ink-faint" />
                        {organization !== undefined && !namesBody ? (
                          <>
                            {" "}
                            <span className="text-ink-faint">
                              <L nl="bij" en="at" />
                            </span>{" "}
                            <EntityPeekLink id={position.organization} variant="quiet" />
                          </>
                        ) : null}
                      </li>
                    );
                  })}
                  {currentPositions.length > HEADER_ROLE_LIMIT ? (
                    <li className="text-xs text-ink-faint">
                      <a href="#posities-titel" className="tap-row underline-offset-2 hover:text-ink hover:underline">
                        <T area="entity" k="rolesMore" vars={{ n: currentPositions.length - HEADER_ROLE_LIMIT }} />
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
        <FactTiles facts={facts} className="mt-4" />
        {description !== null ? (
          <LocalizedDescription
            nl={description.nl}
            en={description.en}
            className="mt-4 max-w-prose text-sm leading-relaxed text-ink-muted"
          />
        ) : null}
      </header>

      <div className="mt-6 min-w-0 space-y-4">
        <EntityTabs
          news={
            <div>
              <h2 id="nieuws-paneel-titel" className="sr-only">
                <T area="entity" k="tabNews" />
              </h2>
              {news.length > 0 ? (
                <div className="mt-3">
                  <NewsPanel scope="custom" items={news} initialLimit={4} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-faint">
                  <T area="entity" k="newsEmptyTitle" />
                </p>
              )}
            </div>
          }
          extra={
            activity !== null
              ? [
                  {
                    value: "voorstellen",
                    label: <L nl="Voorstellen en moties" en="Proposals and motions" />,
                    content: <PersonActivity view={activity} />,
                  },
                ]
              : []
          }
          connections={
            <div>
              <h2 id="verbindingen-paneel-titel" className="sr-only">
                <T area="entity" k="whosConnected" />
              </h2>
              <div className="mt-3">
                <EntityConnections connections={connections} selfId={person.id} />
              </div>
            </div>
          }
        />

        {tenures.length > 0 ? (
          <FactGroup id="posities-titel" icon={<HistoryIcon />} title={<T area="entity" k="rolesTitle" />} count={tenures.length}>
            <TenureTimeline tenures={tenures} variant="person" labelKey="rolesTitle" limit={6} />
          </FactGroup>
        ) : null}

        {careerCount > 0 ? (
          <FactGroup id="loopbaan" icon={<BriefcaseIcon />} title={<T area="entity" k="careerTitle" />} count={careerCount}>
            <CareerTimeline groups={career} />
          </FactGroup>
        ) : null}

        {memberships.length > 0 ? (
          <FactGroup icon={<SeatIcon />} title={<T area="entity" k="membershipsTitle" />} count={memberships.length}>
            <MembershipList memberships={memberships} />
          </FactGroup>
        ) : null}
      </div>

      <SourceList sources={person.sources} />
    </>
  );
}
