import Link from "next/link";
import { KindBadge } from "@/components/kind-badge";
import { T } from "@/components/i18n/t";
import { formatPeriod } from "@/lib/format";
import type { MemberEntry } from "@/lib/entity";
import { PersonPortrait, PersonPortraitCredit } from "./person-portrait";

export function MemberList({ members }: { members: MemberEntry[] }) {
  if (members.length === 0) return null;
  return (
    <ol className="space-y-2">
      {members.map(({ membership, person }) => (
        <li
          key={membership.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2"
        >
          <span className="flex min-w-0 items-center gap-3">
            <PersonPortrait person={person} size={36} />
            <span className="min-w-0">
              <Link
                href={`/personen/${person.slug}/`}
                className="text-sm font-medium text-ink underline-offset-2 hover:text-accent-text hover:underline"
              >
                {person.name}
              </Link>
              <span className="sr-only">
                <T area="entity" k="imageCredit" />: <PersonPortraitCredit person={person} />
              </span>
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-2">
            {membership.fractie !== null ? <KindBadge>{membership.fractie}</KindBadge> : null}
            {membership.seatNumber !== null ? (
              <span className="text-xs text-ink-faint">
                <T area="entity" k="seatNumber" vars={{ n: membership.seatNumber }} />
              </span>
            ) : null}
            <span className="text-xs text-ink-faint">{formatPeriod(membership.start, membership.end)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
