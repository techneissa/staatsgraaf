import Link from "next/link";
import { PersonPortrait, PersonPortraitCredit } from "@/components/entity/person-portrait";
import type { FocusPerson } from "@/lib/home";

function PersonBubble({ entry }: { entry: FocusPerson }) {
  const title = [entry.person.name, entry.positionTitle].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/personen/${entry.person.slug}/`}
      title={title}
      aria-label={title}
      className="group relative block h-11 w-11 shrink-0 rounded-pill ring-2 ring-canvas transition-fast hover:z-20 hover:ring-accent"
    >
      <PersonPortrait person={entry.person} size={44} />
      <PersonPortraitCredit person={entry.person} className="sr-only" />
    </Link>
  );
}

/**
 * CivLab-style avatar strip: overlapping rounded portraits with the name on
 * hover via the title attribute; the first item carries no negative margin so
 * the row stays aligned.
 */
export function PeopleStrip({ people }: { people: FocusPerson[] }) {
  return (
    <ul className="flex flex-wrap items-center">
      {people.map((entry, index) => (
        <li key={entry.person.id} className={index > 0 ? "-ml-2.5" : undefined}>
          <PersonBubble entry={entry} />
        </li>
      ))}
    </ul>
  );
}
