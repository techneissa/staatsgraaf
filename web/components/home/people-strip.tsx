import Link from "next/link";
import { PersonPortrait, PersonPortraitCredit } from "@/components/entity/person-portrait";
import { PowerMapCallout } from "@/components/home/power-map-callout";
import type { FocusPerson } from "@/lib/home";

type StripPerson = {
  person: FocusPerson["person"];
  positionTitle: string | null;
};

function PersonBubble({ entry }: { entry: StripPerson }) {
  const { person } = entry;
  const title = [person.name, entry.positionTitle].filter(Boolean).join(" · ");
  return (
    <li className="group relative -ml-2.5 first:ml-0">
      <Link
        href={`/personen/${person.slug}/`}
        title={title}
        aria-label={title}
        className="relative z-10 block h-11 w-11 shrink-0 rounded-pill ring-2 ring-canvas transition-fast hover:z-20 hover:ring-accent"
      >
        <PersonPortrait person={person} size={44} />
        <PersonPortraitCredit person={person} className="sr-only" />
      </Link>
      <div className="invisible absolute left-0 top-12 z-30 flex w-max max-w-[14rem] flex-col gap-1.5 rounded-md border border-line bg-surface p-2.5 shadow-lg opacity-0 transition-fast group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <p className="text-xs font-medium leading-snug text-ink">{person.name}</p>
        {entry.positionTitle ? (
          <p className="text-[11px] leading-snug text-ink-muted">{entry.positionTitle}</p>
        ) : null}
        <PowerMapCallout slug={person.slug} title={person.name} />
      </div>
    </li>
  );
}

/**
 * CivLab-style avatar strip: overlapping rounded portraits whose hover (or
 * keyboard focus) reveals a callout with the name and a button that focuses
 * that person in the power map canvas.
 */
export function PeopleStrip({ people }: { people: FocusPerson[] }) {
  const entries: StripPerson[] = people.map((entry) => ({
    person: entry.person,
    positionTitle: entry.positionTitle,
  }));
  return (
    <ul className="flex flex-wrap items-center">
      {entries.map((entry) => (
        <PersonBubble key={entry.person.id} entry={entry} />
      ))}
    </ul>
  );
}
