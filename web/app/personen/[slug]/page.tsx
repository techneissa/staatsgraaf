import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { JsonLd } from "@/components/json-ld";
import { KindBadge } from "@/components/kind-badge";
import { SourceLink } from "@/components/source-link";
import { SourceList } from "@/components/source-list";
import { Timeline, type TimelineItem } from "@/components/timeline";
import { EntityFacts, type EntityFact } from "@/components/entity/entity-facts";
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
  getMediaItem,
  mediaCreditLine,
  personBirthDate,
  personDescription,
  personParty,
  personPortraitId,
} from "@/lib/entity";
import { formatDate, formatPeriod } from "@/lib/format";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { Organization } from "@/lib/types";

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

  const party = personParty(person);
  const birthDate = personBirthDate(person);
  const description = personDescription(person);
  const portrait = getMediaItem(personPortraitId(person));

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
        "Onbekende organisatie"
      ),
      meta: (
        <span className="inline-flex flex-wrap items-baseline gap-x-2">
          <span>Lidmaatschap</span>
          {source ? (
            <SourceLink href={source.url} meta={source.publisher}>
              Bron
            </SourceLink>
          ) : null}
        </span>
      ),
      period: formatPeriod(membership.start, membership.end),
      current: membership.end === null,
      badges,
    };
  });

  const currentTitles = tenures
    .filter((tenure) => tenure.end === null)
    .map((tenure) => getPositionById(tenure.position)?.title)
    .filter((title): title is string => title !== undefined);

  const currentOrganizationIds = new Set<string>();
  for (const tenure of tenures) {
    if (tenure.end !== null) continue;
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

  const facts: EntityFact[] = [
    { label: "Partij", value: party },
    {
      label: "Geboren",
      value: birthDate !== null ? <time dateTime={birthDate}>{formatDate(birthDate)}</time> : null,
    },
    {
      label: "Wikipedia",
      value: person.wikipedia != null ? (
        <SourceLink href={person.wikipedia}>Wikipedia</SourceLink>
      ) : null,
    },
    {
      label: "Wikidata",
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

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="shrink-0">
            <PersonPortrait person={person} size={96} />
            {portrait !== null ? (
              <p className="mt-2 max-w-[96px] text-xs leading-snug text-ink-faint">
                Beeld: {mediaCreditLine(portrait)}
              </p>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{person.name}</h1>
            {party !== null ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <KindBadge>{party}</KindBadge>
              </div>
            ) : null}
            {description !== null ? (
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
                {description}
              </p>
            ) : null}
            <EntityFacts facts={facts} />
          </div>
        </div>
      </header>

      {tenures.length > 0 ? (
        <section aria-labelledby="functies-titel" className="border-b border-line py-6">
          <h2 id="functies-titel" className="text-lg font-semibold tracking-tight text-ink">
            Functies
          </h2>
          <div className="mt-3">
            <TenureTimeline tenures={tenures} variant="person" label="Functies" />
          </div>
        </section>
      ) : null}

      {memberships.length > 0 ? (
        <section aria-labelledby="lidmaatschappen-titel" className="border-b border-line py-6">
          <h2
            id="lidmaatschappen-titel"
            className="text-lg font-semibold tracking-tight text-ink"
          >
            Lidmaatschappen
          </h2>
          <div className="mt-3">
            <Timeline items={membershipItems} label="Lidmaatschappen" />
          </div>
        </section>
      ) : null}

      {tenures.length === 0 && memberships.length === 0 ? (
        <section aria-labelledby="geen-rol-titel" className="border-b border-line py-6">
          <h2 id="geen-rol-titel" className="text-lg font-semibold tracking-tight text-ink">
            Functies en lidmaatschappen
          </h2>
          <div className="mt-3">
            <EmptyState
              title="Geen gedateerde rol met bron"
              description={`Voor ${person.name} is in de dataset geen functie of lidmaatschap met een startdatum en bron opgenomen.`}
            />
          </div>
        </section>
      ) : null}

      <SourceList sources={person.sources} />
    </>
  );
}
