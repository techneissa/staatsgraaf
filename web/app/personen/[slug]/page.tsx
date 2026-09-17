import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { JsonLd } from "@/components/json-ld";
import { KindBadge } from "@/components/kind-badge";
import { SourceList } from "@/components/source-list";
import { Timeline, type TimelineItem } from "@/components/timeline";
import {
  getOrganizationById,
  getPeople,
  getPersonBySlug,
  getPositionById,
  getMembershipsForPerson,
  getTenuresForPerson,
} from "@/lib/data";
import { formatPeriod } from "@/lib/format";
import { ENTRY_MODE_LABELS, END_REASON_LABELS } from "@/lib/labels";
import { canonical } from "@/lib/site";

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
  return {
    title: person.name,
    description,
    alternates: canonical(`/personen/${person.slug}/`),
    openGraph: { title: person.name, description },
  };
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = getPersonBySlug(slug);
  if (!person) notFound();

  const tenures = getTenuresForPerson(person.id);
  const memberships = getMembershipsForPerson(person.id);

  const tenureItems: TimelineItem[] = tenures.map((tenure) => {
    const position = getPositionById(tenure.position);
    const organization = position ? getOrganizationById(position.organization) : undefined;
    const badges: string[] = [];
    if (tenure.acting) badges.push("Waarnemend");
    if (tenure.entryMode !== null) {
      const label = ENTRY_MODE_LABELS[tenure.entryMode];
      if (label !== undefined && tenure.entryMode !== "benoemd") badges.push(label);
    }
    if (tenure.end !== null && tenure.endReason !== null) {
      badges.push(END_REASON_LABELS[tenure.endReason]);
    }
    return {
      id: tenure.id,
      title: position ? (
        <Link
          href={`/posities/${position.slug}/`}
          className="underline-offset-2 hover:text-accent-text hover:underline"
        >
          {position.title}
        </Link>
      ) : (
        "Onbekende positie"
      ),
      meta: organization ? (
        <Link
          href={`/organisaties/${organization.slug}/`}
          className="underline-offset-2 hover:underline"
        >
          {organization.name}
        </Link>
      ) : null,
      period: formatPeriod(tenure.start, tenure.end),
      current: tenure.end === null,
      badges,
    };
  });

  const membershipItems: TimelineItem[] = memberships.map((membership) => {
    const organization = getOrganizationById(membership.organization);
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
      meta: "Lidmaatschap",
      period: formatPeriod(membership.start, membership.end),
      current: membership.end === null,
      badges,
    };
  });

  const currentPositions = tenures
    .filter((tenure) => tenure.end === null)
    .map((tenure) => getPositionById(tenure.position)?.title)
    .filter((title): title is string => title !== undefined);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: person.name,
          ...(currentPositions.length > 0 ? { jobTitle: currentPositions } : {}),
        }}
      />

      <Breadcrumb items={[{ label: "NL Overheid Graph", href: "/" }, { label: person.name }]} />

      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{person.name}</h1>
        {person.party !== null ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <KindBadge>{person.party}</KindBadge>
          </div>
        ) : null}
        {person.description !== null ? (
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
            {person.description}
          </p>
        ) : null}
      </header>

      <section aria-labelledby="functies-titel" className="border-b border-line py-6">
        <h2 id="functies-titel" className="text-lg font-semibold tracking-tight text-ink">
          Functies
        </h2>
        {tenureItems.length > 0 ? (
          <div className="mt-3">
            <Timeline items={tenureItems} label="Functies" />
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState
              title="Geen functies bekend"
              description="Voor deze persoon is nog geen functie met bron opgenomen."
            />
          </div>
        )}
      </section>

      {membershipItems.length > 0 ? (
        <section aria-labelledby="lidmaatschappen-titel" className="border-b border-line py-6">
          <h2 id="lidmaatschappen-titel" className="text-lg font-semibold tracking-tight text-ink">
            Lidmaatschappen
          </h2>
          <div className="mt-3">
            <Timeline items={membershipItems} label="Lidmaatschappen" />
          </div>
        </section>
      ) : null}

      <SourceList sources={person.sources} />
    </>
  );
}
