import Link from "next/link";
import { KindBadge } from "./kind-badge";
import { formatPeriodShort } from "@/lib/format";
import type { Person } from "@/lib/types";

type PersonCardProps = {
  person: Person;
  positionTitle?: string | null;
  startedAt?: string | null;
  acting?: boolean;
};

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((part) => part.length > 1 && /^[A-ZÀ-Ý]/.test(part));
  if (parts.length === 0) return name.slice(0, 1).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return `${first}${last}`.toUpperCase();
}

export function PersonCard({ person, positionTitle, startedAt, acting }: PersonCardProps) {
  return (
    <article className="flex items-start gap-3 rounded-md border border-line bg-surface p-4">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-line bg-surface-raised text-sm font-medium text-ink-muted"
      >
        {initials(person.name)}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">
          <Link
            href={`/personen/${person.slug}/`}
            className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
          >
            {person.name}
          </Link>
        </h3>
        {positionTitle ? <p className="mt-0.5 text-sm text-ink-muted">{positionTitle}</p> : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {person.party !== null ? <KindBadge>{person.party}</KindBadge> : null}
          {acting ? <KindBadge tone="accent">Waarnemend</KindBadge> : null}
          {startedAt ? (
            <span className="text-xs text-ink-faint">{formatPeriodShort(startedAt, null)}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
