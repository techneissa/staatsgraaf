import Link from "next/link";
import { KindBadge } from "@/components/kind-badge";
import type { FocusPerson } from "@/lib/home";

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((part) => part.length > 1 && /^[A-ZÀ-Ý]/.test(part));
  if (parts.length === 0) return name.slice(0, 1).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return `${first}${last}`.toUpperCase();
}

function PersonTile({ entry }: { entry: FocusPerson }) {
  return (
    <Link
      href={`/personen/${entry.person.slug}/`}
      className="group flex h-full w-40 shrink-0 snap-start flex-col rounded-md border border-line bg-surface p-3 transition-fast hover:border-line-strong"
    >
      <span className="block h-20 w-20 overflow-hidden rounded-pill border border-line bg-surface-raised">
        {entry.portrait !== null ? (
          <img
            src={entry.portrait.url}
            alt=""
            width={80}
            height={80}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-lg font-medium text-ink-muted"
          >
            {initials(entry.person.name)}
          </span>
        )}
      </span>
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
      {entry.portrait !== null ? (
        <span className="sr-only">
          Beeld: {entry.portrait.credit} ({entry.portrait.license})
        </span>
      ) : null}
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
