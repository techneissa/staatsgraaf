import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { T } from "@/components/i18n/t";
import { IconLegend, IconValue } from "@/components/legend-icons";
import { getDatasetDate } from "@/lib/data";
import { PARTIES, partySlug } from "@/lib/parties";
import { seatCountsByPartyKey } from "@/lib/parliament";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

const TK_ID = "org:tweede-kamer";
const EK_ID = "org:eerste-kamer";

export const metadata: Metadata = pageMetadata({
  title: "Partijen",
  description:
    "De politieke partijen uit de dataset met hun officiële naam, kleur en links, en de zetels die ze op dit snapshot in de Tweede en Eerste Kamer hebben, met een bron per gegeven.",
  path: "/partijen/",
  snapshotDate: getDatasetDate(),
});

export default function PartiesIndexPage() {
  const tkCounts = seatCountsByPartyKey(TK_ID);
  const ekCounts = seatCountsByPartyKey(EK_ID);
  const pageUrl = absoluteUrl("/partijen/");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Partijen · ${SITE_NAME}`,
          description:
            "Politieke partijen in de dataset met kleur, links en huidige zetels in de Kamers.",
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="common" k="navParties" /> }]} />

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          <T area="pages" k="partiesTitle" />
        </h1>
      </header>

      <IconLegend kinds={["tk", "ek"]} className="mt-4" />

      <ul className="mt-4 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-3 p-0">
        {PARTIES.map((party) => {
          const tkSeats = tkCounts.get(party.key) ?? 0;
          const ekSeats = ekCounts.get(party.key) ?? 0;
          return (
            <li key={party.key} className="min-w-0">
              <Link
                href={`/partijen/${partySlug(party)}/`}
                className="flex h-full min-w-0 flex-col gap-1 rounded-md border border-line border-t-4 bg-surface p-3 transition-fast hover:border-line-strong"
                style={{ borderTopColor: party.color ?? "var(--t-color-line-strong)" }}
              >
                <span className="text-sm font-semibold leading-snug text-ink">{party.abbrev}</span>
                <span className="text-xs leading-snug text-ink-muted" lang="nl">
                  {party.name.nl !== party.abbrev ? party.name.nl : null}
                </span>
                <span className="mt-auto flex items-center gap-3 pt-1 text-xs text-ink-muted">
                  <IconValue kind="tk" value={tkSeats} />
                  <IconValue kind="ek" value={ekSeats} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
