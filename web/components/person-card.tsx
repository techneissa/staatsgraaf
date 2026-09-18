import Link from "next/link";
import { PersonPortrait, PersonPortraitCredit } from "./entity/person-portrait";
import { KindBadge } from "./kind-badge";
import { formatPeriodShort } from "@/lib/format";
import type { Person } from "@/lib/types";

type PersonCardProps = {
  person: Person;
  positionTitle?: string | null;
  startedAt?: string | null;
  acting?: boolean;
};

export function PersonCard({ person, positionTitle, startedAt, acting }: PersonCardProps) {
  return (
    <article className="flex items-start gap-3 rounded-md border border-line bg-surface p-4">
      <PersonPortrait person={person} size={44} className="mt-0.5" />
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
          {person.party != null ? <KindBadge>{person.party}</KindBadge> : null}
          {acting ? <KindBadge tone="accent">Waarnemend</KindBadge> : null}
          {startedAt ? (
            <span className="text-xs text-ink-faint">{formatPeriodShort(startedAt, null)}</span>
          ) : null}
        </div>
        <PersonPortraitCredit person={person} className="mt-1 block text-[10px] leading-tight text-ink-faint" />
      </div>
    </article>
  );
}
