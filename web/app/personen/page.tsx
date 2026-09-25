import type { Metadata } from "next";
import { LocalCount } from "@/components/content/local-date";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { T } from "@/components/i18n/t";
import { PeopleFilters } from "@/components/people/people-filters";
import { getPeopleIndex } from "@/components/people/people-index";
import { PersonTile } from "@/components/people/person-tile";
import { getDatasetDate } from "@/lib/data";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Personen",
  description:
    "Alle personen in de dataset, alfabetisch, met portret waar een gelicentieerd beeld beschikbaar is en de functie die de dataset met een bron aan hen koppelt.",
  path: "/personen/",
  snapshotDate: getDatasetDate(),
});

const GRID_ID = "personen-lijst";

/**
 * The people index: a sticky filter bar over a dense grid of person cards in
 * A-Z sections. Every card is in the static HTML; the bar only hides cards.
 * Sections off screen skip layout and paint (content-visibility), so the page
 * stays quick with all people on it.
 */
export default function PeopleIndexPage() {
  const { sections, groups, parties, total } = getPeopleIndex();
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

      <PeopleFilters
        targetId={GRID_ID}
        groups={groups}
        parties={parties}
        letters={sections.map((section) => section.letter)}
      />

      <div id={GRID_ID}>
        {sections.map((section) => (
          <section
            key={section.letter}
            data-letter={section.letter}
            aria-labelledby={`letter-${section.letter}`}
            className="mt-5 [contain-intrinsic-size:auto_1200px] [content-visibility:auto]"
          >
            <h2
              id={`letter-${section.letter}`}
              className="mb-2 scroll-mt-36 text-sm font-semibold tabular-nums text-ink-faint"
            >
              {section.letter}
            </h2>
            <ul
              role="list"
              className="grid list-none grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2 p-0 @lg:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]"
            >
              {section.people.map((entry) => (
                <PersonTile key={entry.id} entry={entry} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
