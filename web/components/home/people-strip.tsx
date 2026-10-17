import { PersonPortrait, PersonPortraitCredit } from "@/components/entity/person-portrait";
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
    <li className="group relative -ml-2.5 first:ml-0">
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
        className={`absolute top-12 z-30 hidden w-max max-w-[min(12rem,calc(100vw-1.5rem))] flex-col gap-1.5 rounded-md border border-line bg-surface p-2.5 shadow-lg group-focus-within:flex [@media(hover:hover)]:group-hover:flex ${
          side === "left" ? "left-0" : "right-0"
        }`}
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
 * that person in the power map canvas. Callouts on the right half open to the
 * left, so a hidden callout never widens the page past the screen edge.
 */
export function PeopleStrip({ people }: { people: FocusPerson[] }) {
  const entries: StripPerson[] = people.map((entry) => ({
    person: entry.person,
    positionTitle: entry.positionTitle,
  }));
  return (
    <ul className="flex flex-wrap items-center gap-y-2 @[40rem]:gap-y-3">
      {entries.map((entry, index) => (
        <PersonBubble key={entry.person.id} entry={entry} side={index < entries.length / 2 ? "left" : "right"} />
      ))}
    </ul>
  );
}
