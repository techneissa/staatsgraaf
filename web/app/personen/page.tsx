import type { Metadata } from "next";
import { LocalCount } from "@/components/content/local-date";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { T } from "@/components/i18n/t";
import { preload } from "react-dom";
import { PeopleIndexView } from "@/components/people/people-index-view";
import { getDatasetDate } from "@/lib/data";
import { buildPeopleRows } from "@/lib/index-rows";
import { INDEX_FIRST_SCREEN, indexListUrl } from "@/lib/index-lists";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Personen",
  description:
    "Alle personen in de dataset, alfabetisch, met portret waar een gelicentieerd beeld beschikbaar is en de functie die de dataset met een bron aan hen koppelt.",
  path: "/personen/",
  snapshotDate: getDatasetDate(),
});

/**
 * The people index: a sticky filter bar over a dense grid of person cards in
 * A-Z sections. The page carries the first screen of cards; the whole list is
 * one small JSON file (/peek/lists/personen.json) that the view fetches at
 * once and filters on the client, so the page weighs about as much as any
 * other and every person is still one search away.
 */
export default function PeopleIndexPage() {
  const { rows, groups, parties, letters, total } = buildPeopleRows();
  preload(indexListUrl("personen"), { as: "fetch", crossOrigin: "anonymous" });
  const pageUrl = absoluteUrl("/personen/");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Personen · ${SITE_NAME}`,
          description: "Alfabetische lijst van personen in de Nederlandse staatsinrichting.",
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="entity" k="peopleIndexTitle" /> }]} />

      <header className="mt-4 flex items-baseline gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          <T area="entity" k="peopleIndexTitle" />
        </h1>
        <span className="text-sm tabular-nums text-ink-faint">
          <LocalCount value={total} />
        </span>
      </header>

      <PeopleIndexView initial={rows.slice(0, INDEX_FIRST_SCREEN.personen)} groups={groups} parties={parties} letters={letters} total={total} />
    </>
  );
}
