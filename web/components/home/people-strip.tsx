import Link from "next/link";
import { KindBadge } from "@/components/kind-badge";
import { PersonPortrait, PersonPortraitCredit } from "@/components/entity/person-portrait";
import type { FocusPerson } from "@/lib/home";

function PersonTile({ entry }: { entry: FocusPerson }) {
  return (
    <Link
      href={`/personen/${entry.person.slug}/`}
      className="group flex h-full w-40 shrink-0 snap-start flex-col rounded-md border border-line bg-surface p-3 transition-fast hover:border-line-strong"
    >
      <PersonPortrait person={entry.person} size={80} />
      <span className="mt-2 block text-sm font-semibold text-ink group-hover:text-accent-text">
        {entry.person.name}
      </span>
      {entry.positionTitle !== null ? (
        <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
          {entry.positionTitle}
        </span>
      ) : null}
      <span className="mt-1.5 flex flex-wrap gap-1">
        {entry.person.party !== null ? <KindBadge>{entry.person.party}</KindBadge> : null}
        {entry.acting ? <KindBadge tone="accent">Waarnemend</KindBadge> : null}
      </span>
      <PersonPortraitCredit person={entry.person} className="sr-only" />
    </Link>
  );
}

export function PeopleStrip({ people }: { people: FocusPerson[] }) {
  return (
    <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
      {people.map((entry) => (
        <li key={entry.person.id}>
          <PersonTile entry={entry} />
        </li>
      ))}
    </ul>
  );
}
