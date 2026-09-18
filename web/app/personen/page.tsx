import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { PersonPortrait } from "@/components/entity/person-portrait";
import { PartyBadge } from "@/components/party-badge";
import {
  getDatasetDate,
  getPeople,
  getPositionById,
  getTenuresForPerson,
} from "@/lib/data";
import { personPortraitId } from "@/lib/entity";
import { formatCount } from "@/lib/format";
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
  const withPortrait = people.filter((person) => personPortraitId(person) !== null).length;
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

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: "Personen" }]} />

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Personen</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
          Alle {formatCount(people.length)} personen in de dataset, alfabetisch. Van{" "}
          {formatCount(withPortrait)} personen is een gelicentieerd portret opgenomen; de overige
          tonen initialen. Elke functie op een persoonspagina heeft een bron.
        </p>
      </header>

      <nav aria-label="Alfabet" className="mt-6">
        <ul className="flex flex-wrap gap-1.5">
          {groups.map((group) => (
            <li key={group.letter}>
              <a
                href={`#letter-${group.letter}`}
                className="inline-flex h-7 min-w-7 items-center justify-center rounded-pill border border-line bg-surface px-2 text-xs font-medium text-ink-muted transition-fast hover:border-line-strong hover:text-ink"
              >
                {group.letter}
                <span className="ms-1 tabular-nums text-ink-faint">
                  {group.people.length}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {groups.map((group) => (
        <section key={group.letter} aria-labelledby={`letter-${group.letter}`} className="mt-8">
          <h2
            id={`letter-${group.letter}`}
            className="scroll-mt-20 border-b border-line pb-2 text-lg font-semibold tracking-tight text-ink"
          >
            {group.letter}
            <span className="ms-2 text-sm font-normal tabular-nums text-ink-faint">
              {formatCount(group.people.length)}
            </span>
          </h2>
          <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {group.people.map((person) => {
              const role = currentRole(person.id);
              return (
                <li key={person.id}>
                  <article className="flex items-center gap-3 rounded-md border border-line bg-surface p-2.5 transition-fast hover:border-line-strong">
                    <PersonPortrait person={person} size={40} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium">
                        <Link
                          href={`/personen/${person.slug}/`}
                          className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
                        >
                          {person.name}
                        </Link>
                      </h3>
                      {role !== null ? (
                        <p className="truncate text-xs text-ink-muted">{role}</p>
                      ) : null}
                    </div>
                    {person.party !== null ? (
                      <span className="shrink-0">
                        <PartyBadge party={person.party} />
                      </span>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
