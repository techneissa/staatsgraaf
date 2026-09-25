import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { SourceLink } from "@/components/source-link";
import { SourceList } from "@/components/source-list";
import { T } from "@/components/i18n/t";
import { LegendIcon } from "@/components/legend-icons";
import { LocalDate } from "@/components/content/local-date";
import { ShareButton } from "@/components/share-button";
import { MemberList } from "@/components/entity/member-list";
import { ColorDot, FactTiles } from "@/components/entity/fact-tiles";
import { getDatasetDate, getPersonById } from "@/lib/data";
import type { MemberEntry } from "@/lib/entity";
import { currentMembershipsForPartyKey, seatTallyForOrganization } from "@/lib/parliament";
import { ArchChart } from "@/components/parliament/arch-chart";
import { SeatSparkline } from "@/components/parliament/seat-sparkline";
import { PARTIES, partyBySlug, partySlug } from "@/lib/parties";
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
          { label: <T area="common" k="navParties" />, href: "/partijen/" },
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
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{party.name.nl}</h1>
            <p className="mt-1 text-sm text-ink-muted" lang="en">
              {party.name.en}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <ShareButton title={party.name.nl} />
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
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

      <FactTiles
        className="mt-6"
        facts={[
          {
            key: "colour",
            icon: <ColorDot color={party.color ?? "var(--t-color-line-strong)"} />,
            label: <T area="pages" k="partyColourLabel" />,
            value: (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {party.color !== null ? <code className="text-xs">{party.color}</code> : <T area="pages" k="partyNoColour" />}
                {party.source !== null ? (
                  <SourceLink href={party.source} meta={party.confidence} tone="quiet">
                    <T area="pages" k="partyColourConfidence" />
                  </SourceLink>
                ) : null}
                <span className="text-xs text-ink-faint">
                  <T area="pages" k="partyColourRetrieved" /> <LocalDate iso={party.retrieved} />
                </span>
              </span>
            ),
          },
        ]}
      />

      <section aria-labelledby="party-tk" className="mt-6">
        <h2 id="party-tk" className="border-b border-line pb-2 text-lg font-semibold tracking-tight text-ink">
          <span className="me-2 inline-block align-middle"><LegendIcon kind="tk" size={18} /></span>
          <T area="pages" k="partiesSeatsTK" />
          <span className="ms-2 text-sm font-normal tabular-nums text-ink-faint">{tkMembers.length}</span>
        </h2>
        {tkMembers.length > 0 ? (
          <div className="mt-3">
            {tkTally !== null ? <ArchChart tally={tkTally} highlightKey={party.key} compact /> : null}
            <SeatSparkline partyKey={party.key} organizationId={TK_ID} color={party.color} />
            <MemberList members={tkMembers} showParty={false} />
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
            <span className="me-2 inline-block align-middle"><LegendIcon kind="ek" size={18} /></span>
            <T area="pages" k="partiesSeatsEK" />
            <span className="ms-2 text-sm font-normal tabular-nums text-ink-faint">{ekMembers.length}</span>
          </h2>
          <div className="mt-3">
            {ekTally !== null ? <ArchChart tally={ekTally} highlightKey={party.key} compact /> : null}
            <SeatSparkline partyKey={party.key} organizationId={EK_ID} color={party.color} />
            <MemberList members={ekMembers} showParty={false} />
          </div>
        </section>
      ) : null}

      {memberSourceRefs.length > 0 ? (
        <SourceList sources={memberSourceRefs} />
      ) : null}

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
