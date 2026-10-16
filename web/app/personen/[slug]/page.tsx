import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { EntityTabs } from "@/components/entity-tabs";
import { JsonLd } from "@/components/json-ld";
import { SourceList } from "@/components/source-list";
import { NewsPanel } from "@/components/news/news-panel";
import { L, T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { MembershipList } from "@/components/entity/membership-list";
import { EntityConnections } from "@/components/entity/entity-connections";
import { GapNote } from "@/components/entity/gap-note";
import { CareerTimeline } from "@/components/entity/career-timeline";
import { FactGroup } from "@/components/entity/fact-group";
import { BriefcaseIcon, HistoryIcon, SeatIcon } from "@/components/entity/icons";
import { PersonActivity } from "@/components/entity/person-activity";
import { PersonHeader } from "@/components/entity/person-header";
import { currentPersonOffices } from "@/lib/person-offices";
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
import { sparsePerson } from "@/lib/entity-sparse";
import { descriptionDateConflicts } from "@/lib/entity-page";
import { withoutDerived } from "@/lib/entity-rows";
import { isSplinterGroup, partyByDataset, partySlug } from "@/lib/parties";
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
  const summary = personSummary(person)?.nl;
  const description =
    (summary !== undefined ? `${person.name}: ${summary}.` : undefined) ??
    descriptionFor(person.id, person.description)?.nl ??
    (role !== null
      ? `${person.name} is ${role.charAt(0).toLowerCase()}${role.slice(1)}. Bekijk de functies, lidmaatschappen en bronnen.`
      : sparsePerson(person).description);
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
  // Tenures and memberships are listed with their periods in the sections below, so the tab keeps only sourced relations.
  const connections: Connection[] = withoutDerived(getConnectionsForEntity(person.id), ["holds_position", "member_of"]);
  const news = getNewsForEntity(person.id);
  const activity = getPersonActivityView(person.id);

  // A one-member fractie ("Lid Keijzer", "Fractie-Beukering") is not a party: show only a party the registry knows.
  const partyRecord = partyByDataset(personParty(person));
  const party = partyRecord !== null && !isSplinterGroup(personParty(person)) ? personParty(person) : null;
  const birthDate = personBirthDate(person);
  const description = descriptionFor(person.id, person.description);
  const summary = personSummary(person, { dateStyle: "short" });
  const sparse = tenures.length === 0 && memberships.length === 0 ? sparsePerson(person) : null;
  const fractie = partyRecord !== null && party !== null ? { label: partyRecord.abbrev, href: `/partijen/${partySlug(partyRecord)}/` } : null;
  const career = getCareerForPerson(person.id);
  const careerCount = career.reduce((sum, group) => sum + group.items.length, 0);
  const birthSource = birthDate !== null ? birthDateSource(person) : null;

  const currentTenures = tenures.filter((tenure) => tenure.end === null);
  const dateConflicts =
    description !== null
      ? descriptionDateConflicts(description.nl, [
          ...tenures.flatMap((tenure) => [tenure.start, tenure.end]),
          ...memberships.flatMap((membership) => [membership.start, membership.end]),
        ])
      : [];

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
  const offices = currentPersonOffices(tenures, memberships);

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

      <Breadcrumb
        items={[
          { label: SITE_NAME, href: "/" },
          { label: <T area="common" k="navPeople" />, href: "/personen/" },
          { label: person.name },
        ]}
      />

      <PersonHeader
        person={person}
        party={party !== null ? partyRecord : null}
        birthDate={birthDate}
        birthSource={birthSource}
        summary={summary}
        description={description}
        dateConflicts={dateConflicts}
        actingTenures={actingTenures}
        offices={offices}
      />

      <div className="mt-6 min-w-0 space-y-4">
        <EntityTabs
          hasNews={news.length > 0}
          hasConnections={connections.length > 0}
          news={
            <div>
              <div className="mt-3">
                <NewsPanel scope="custom" items={news} initialLimit={4} />
              </div>
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
              <div className="mt-3">
                <EntityConnections connections={connections} selfId={person.id} />
              </div>
            </div>
          }
        />

        {sparse !== null ? (
          <GapNote sources={person.sources}>
            <T area="entity" k="personEmptyNote" />
            {sparse.organizations.length > 0 ? (
              <>
                {" "}
                <T area="entity" k="personNamedWith" />{" "}
                {sparse.organizations.map((organization, index) => (
                  <span key={organization.id}>
                    {index > 0 ? ", " : null}
                    <EntityPeekLink id={organization.id} />
                  </span>
                ))}
                .
              </>
            ) : null}
          </GapNote>
        ) : null}

        {tenures.length > 0 ? (
          <FactGroup id="posities-titel" icon={<HistoryIcon />} title={<T area="entity" k="rolesTitle" />} count={tenures.length}>
            <TenureTimeline tenures={tenures} variant="person" labelKey="rolesTitle" limit={6} />
          </FactGroup>
        ) : null}

        {careerCount > 0 ? (
          <FactGroup id="loopbaan" icon={<BriefcaseIcon />} title={<T area="entity" k="careerTitle" />} count={careerCount}>
            <CareerTimeline groups={career} fractie={fractie} />
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
