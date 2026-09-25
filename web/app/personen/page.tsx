import type { Metadata } from "next";
import { LocalCount } from "@/components/content/local-date";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PersonPortrait } from "@/components/entity/person-portrait";
import { PartyBadge } from "@/components/party-badge";
import { T, LocalText } from "@/components/i18n/t";
import { positionEn } from "@/lib/name-gloss";
import { PeekLink } from "@/components/peek/peek-link";
import { LabelledNav } from "@/components/entity/labelled-nav";
import { ShowAllList } from "@/components/news/show-all-list";
import {
  getDatasetDate,
  getPeople,
  getPositionById,
  getTenuresForPerson,
} from "@/lib/data";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { Person } from "@/lib/types";

export const metadata: Metadata = pageMetadata({
  title: "Personen",
  description:
    "Alle personen in de dataset, alfabetisch, met portret waar een gelicentieerd beeld beschikbaar is en de functie die de dataset met een bron aan hen koppelt.",
  path: "/personen/",
  snapshotDate: getDatasetDate(),
});

function currentRole(personId: string): string | null {
  for (const tenure of getTenuresForPerson(personId)) {
    if (tenure.end !== null) continue;
    const position = getPositionById(tenure.position);
    if (position) return position.title;
  }
  return null;
}

type LetterGroup = { letter: string; people: Person[] };

function groupByLetter(people: Person[]): LetterGroup[] {
  const groups: LetterGroup[] = [];
  for (const person of people) {
    const letter = person.name.charAt(0).toUpperCase();
    const last = groups[groups.length - 1];
    if (last !== undefined && last.letter === letter) last.people.push(person);
    else groups.push({ letter, people: [person] });
  }
  return groups;
}

export default function PeopleIndexPage() {
  const people = [...getPeople()].sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const groups = groupByLetter(people);
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

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          <T area="entity" k="peopleIndexTitle" />
        </h1>
      </header>

      <LabelledNav area="entity" k="alphabetNavLabel" className="mt-6">
        <ul className="flex flex-wrap gap-1.5">
          {groups.map((group) => (
            <li key={group.letter}>
              <a
                href={`#letter-${group.letter}`}
                className="inline-flex h-7 min-w-7 items-center justify-center rounded-pill border border-line bg-surface px-2 text-xs font-medium text-ink-muted transition-fast hover:border-line-strong hover:text-ink pointer-coarse:h-11 pointer-coarse:min-w-11"
              >
                {group.letter}
                <span className="ms-1 tabular-nums text-ink-faint">
                  {group.people.length}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </LabelledNav>

      {groups.map((group) => (
        <section key={group.letter} aria-labelledby={`letter-${group.letter}`} className="mt-8">
          <h2
            id={`letter-${group.letter}`}
            className="scroll-mt-20 border-b border-line pb-2 text-lg font-semibold tracking-tight text-ink"
          >
            {group.letter}
            <span className="ms-2 text-sm font-normal tabular-nums text-ink-faint">
              <LocalCount value={group.people.length} />
            </span>
          </h2>
          <ShowAllList
            items={group.people}
            className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3"
            keyOf={(person) => person.id}
            render={(person) => {
              const role = currentRole(person.id);
              return (
                <article className="relative flex items-center gap-3 rounded-md border border-line/70 p-2.5 transition-fast hover:border-line-strong">
                  <PersonPortrait person={person} size={40} morph />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium">
                      <PeekLink
                        id={person.id}
                        href={`/personen/${person.slug}/`}
                        kind="person"
                        variant="plain"
                        className="after:absolute after:inset-0 after:rounded-md"
                      >
                        {person.name}
                      </PeekLink>
                    </h3>
                    {role !== null ? (
                      <p className="truncate text-xs text-ink-muted" title={role}>
                        {/* The established English title on the meta line, as on the power map (ADR 0012). */}
                        <LocalText nl={role} en={positionEn(role)} />
                      </p>
                    ) : null}
                  </div>
                  {person.party !== null ? (
                    <span className="relative z-10 shrink-0">
                      <PartyBadge party={person.party} />
                    </span>
                  ) : null}
                </article>
              );
            }}
          />
        </section>
      ))}
    </>
  );
}