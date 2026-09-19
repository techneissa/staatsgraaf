import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { SourceLink } from "@/components/source-link";
import { SourceList } from "@/components/source-list";
import { T } from "@/components/i18n/t";
import { MemberList } from "@/components/entity/member-list";
import { getDatasetDate, getPersonById } from "@/lib/data";
import type { MemberEntry } from "@/lib/entity";
import { currentMembershipsForPartyKey, seatCountsByPartyKey, seatTallyForOrganization } from "@/lib/parliament";
import { ArchChart } from "@/components/parliament/arch-chart";
import { PARTIES, partyBySlug, partySlug } from "@/lib/parties";
import { formatDate } from "@/lib/format";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { SourceRef } from "@/lib/types";

const TK_ID = "org:tweede-kamer";
const EK_ID = "org:eerste-kamer";
const CHAMBER_IDS = [TK_ID, EK_ID];

export const dynamicParams = false;

export function generateStaticParams() {
  return PARTIES.map((party) => ({ slug: partySlug(party) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const party = partyBySlug(slug);
  if (!party) return {};
  return pageMetadata({
    title: `${party.name.nl} (${party.abbrev})`,
    description: `${party.name.nl} (${party.abbrev}): officiële naam in het Nederlands en Engels, kleur met bron, website en huidige zetels in de Tweede en Eerste Kamer, met een bron per gegeven.`,
    path: `/partijen/${partySlug(party)}/`,
    snapshotDate: getDatasetDate(),
  });
}

export default async function PartyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const party = partyBySlug(slug);
  if (!party) notFound();

  const tkMembers = partyMembers(party.key, TK_ID);
  const ekMembers = partyMembers(party.key, EK_ID);
  const tkSeats = seatCountsByPartyKey(TK_ID).get(party.key) ?? 0;
  const ekSeats = seatCountsByPartyKey(EK_ID).get(party.key) ?? 0;
  const tkTally = seatTallyForOrganization(TK_ID);
  const ekTally = seatTallyForOrganization(EK_ID);
  const memberSourceRefs: SourceRef[] = [];
  for (const entry of [...tkMembers, ...ekMembers]) {
    const ref = entry.membership.source;
    if (!memberSourceRefs.some((candidate) => candidate.source === ref.source)) {
      memberSourceRefs.push(ref);
    }
    if (memberSourceRefs.length >= 3) break;
  }

  const pageUrl = absoluteUrl(`/partijen/${partySlug(party)}/`);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "PoliticalParty",
          name: party.name.nl,
          alternateName: party.abbrev,
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
          ...(party.website !== null ? { sameAs: [party.website, ...(party.wiki !== null ? [party.wiki] : [])] } : {}),
        }}
      />

      <Breadcrumb
        items={[
          { label: SITE_NAME, href: "/" },
          { label: "Partijen", href: "/partijen/" },
          { label: party.abbrev },
        ]}
      />

      <header className="mt-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-line"
            style={{ backgroundColor: party.color ?? "var(--t-color-line-strong)" }}
          >
            {party.abbrev.slice(0, 4)}
          </span>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">{party.name.nl}</h1>
            <p className="mt-1 text-sm text-ink-muted" lang="en">
              {party.name.en}
            </p>
          </div>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="tabular-nums text-ink-muted">
            <T area="pages" k="partiesSeatsTK" />: <strong className="font-semibold text-ink">{tkSeats}</strong>
          </span>
          <span className="tabular-nums text-ink-muted">
            <T area="pages" k="partiesSeatsEK" />: <strong className="font-semibold text-ink">{ekSeats}</strong>
          </span>
          {party.website !== null ? (
            <SourceLink href={party.website}>
              <T area="entity" k="websiteLabel" />
            </SourceLink>
          ) : null}
          {party.wiki !== null ? (
            <SourceLink href={party.wiki}>Wikipedia</SourceLink>
          ) : null}
        </p>
      </header>

      <section aria-labelledby="party-feiten" className="mt-6">
        <h2 id="party-feiten" className="border-b border-line pb-2 text-lg font-semibold tracking-tight text-ink">
          <T area="entity" k="factsLabel" />
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <dt className="text-ink-faint"><T area="pages" k="partyColourLabel" /></dt>
            <dd className="flex items-center gap-2 text-ink-muted">
              <span
                aria-hidden="true"
                className="inline-block h-4 w-4 rounded-full ring-1 ring-line"
                style={{ backgroundColor: party.color ?? "var(--t-color-line-strong)" }}
              />
              {party.color !== null ? (
                <code className="text-xs">{party.color}</code>
              ) : (
                <T area="pages" k="partyNoColour" />
              )}
              {party.source !== null ? (
                <SourceLink href={party.source} meta={party.confidence}>
                  <T area="pages" k="partyColourConfidence" />
                </SourceLink>
              ) : null}
              <span className="text-xs text-ink-faint">
                <T area="pages" k="partyColourRetrieved" /> {formatDate(party.retrieved)}
              </span>
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <div className="flex gap-2">
              <dt className="text-ink-faint">Nederlands</dt>
              <dd className="text-ink-muted">{party.name.nl}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-faint" lang="en">English</dt>
              <dd className="text-ink-muted" lang="en">{party.name.en}</dd>
            </div>
          </div>
        </dl>
      </section>

      <section aria-labelledby="party-tk" className="mt-6">
        <h2 id="party-tk" className="border-b border-line pb-2 text-lg font-semibold tracking-tight text-ink">
          <T area="pages" k="partiesSeatsTK" />
          <span className="ms-2 text-sm font-normal tabular-nums text-ink-faint">{tkMembers.length}</span>
        </h2>
        {tkMembers.length > 0 ? (
          <div className="mt-3">
            {tkTally !== null ? <ArchChart tally={tkTally} highlightKey={party.key} compact /> : null}
            <MemberList members={tkMembers} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-faint">
            <T area="pages" k="partiesNoSeats" />
          </p>
        )}
      </section>

      {ekMembers.length > 0 ? (
        <section aria-labelledby="party-ek" className="mt-6">
          <h2 id="party-ek" className="border-b border-line pb-2 text-lg font-semibold tracking-tight text-ink">
            <T area="pages" k="partiesSeatsEK" />
            <span className="ms-2 text-sm font-normal tabular-nums text-ink-faint">{ekMembers.length}</span>
          </h2>
          <div className="mt-3">
            {ekTally !== null ? <ArchChart tally={ekTally} highlightKey={party.key} compact /> : null}
            <MemberList members={ekMembers} />
          </div>
        </section>
      ) : null}

      {memberSourceRefs.length > 0 ? (
        <SourceList sources={memberSourceRefs} />
      ) : null}

      <p className="mt-6 text-sm text-ink-muted">
        <T area="pages" k="seeAlso" />:{" "}
        <Link href="/partijen/" className="text-accent-text underline-offset-2 hover:underline">
          <T area="pages" k="partyOverviewLabel" />
        </Link>
      </p>
    </>
  );
}

function partyMembers(key: string, organizationId: string) {
  return currentMembershipsForPartyKey(key, [organizationId])
    .flatMap(({ membership }) => {
      const person = getPersonById(membership.person);
      return person ? [{ membership, person }] : [];
    });
}
