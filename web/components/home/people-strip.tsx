import { PersonPortrait, PersonPortraitCredit } from "@/components/entity/person-portrait";
import { PeopleStripList } from "@/components/home/people-strip-list";
import { PowerMapCallout } from "@/components/home/power-map-callout";
import type { FocusPerson } from "@/lib/home";

type StripPerson = {
  person: FocusPerson["person"];
  positionTitle: string | null;
};

function PersonBubble({ entry, side }: { entry: StripPerson; side: "left" | "right" }) {
  const { person } = entry;
  const title = [person.name, entry.positionTitle].filter(Boolean).join(" · ");
  return (
    <li data-side={side} className="group relative -ml-2.5 first:ml-0">
      <a
        href={`/personen/${person.slug}/`}
        data-peek={person.id}
        data-peek-kind="person"
        aria-haspopup="dialog"
        title={title}
        aria-label={title}
        className="relative z-10 block h-11 w-11 shrink-0 rounded-pill ring-2 ring-canvas transition-fast hover:z-20 hover:ring-accent"
      >
        <PersonPortrait person={person} size={44} morph />
        <PersonPortraitCredit person={person} className="sr-only" />
      </a>
      <div
        className="absolute top-12 left-0 z-30 hidden w-max max-w-[min(12rem,calc(100vw-1.5rem))] flex-col gap-1.5 rounded-md border border-line bg-surface p-2.5 shadow-lg group-data-[side=right]:left-auto group-data-[side=right]:right-0 group-has-[:focus-visible]:flex [@media(hover:hover)]:group-hover:flex"
      >
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
 * Avatar strip of overlapping rounded portraits. A tap or click
 * opens the person's peek (name, role, party, Open page); on devices that
 * hover, hover or keyboard focus also reveals a callout with the name and a button that focuses
 * that person in the power map canvas. A click or tap that closes the peek
 * returns focus to the portrait without showing it (focus-visible only).
 * Callouts on the right half of the strip, measured (people-strip-list.tsx),
 * open to the left, so a callout never leaves the screen.
 */
export function PeopleStrip({ people }: { people: FocusPerson[] }) {
  const entries: StripPerson[] = people.map((entry) => ({
    person: entry.person,
    positionTitle: entry.positionTitle,
  }));
  return (
    <PeopleStripList>
      {entries.map((entry, index) => (
        <PersonBubble key={entry.person.id} entry={entry} side={index < entries.length / 2 ? "left" : "right"} />
      ))}
    </PeopleStripList>
  );
}
