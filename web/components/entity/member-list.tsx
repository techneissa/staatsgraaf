import Link from "next/link";
import { KindBadge } from "@/components/kind-badge";
import { formatPeriod } from "@/lib/format";
import type { MemberEntry } from "@/lib/entity";

export function MemberList({ members }: { members: MemberEntry[] }) {
  if (members.length === 0) return null;
  return (
    <ol className="space-y-2">
      {members.map(({ membership, person }) => (
        <li
          key={membership.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2"
        >
          <Link
            href={`/personen/${person.slug}/`}
            className="text-sm font-medium text-ink underline-offset-2 hover:text-accent-text hover:underline"
          >
            {person.name}
          </Link>
          <span className="flex flex-wrap items-center gap-2">
            {membership.fractie !== null ? <KindBadge>{membership.fractie}</KindBadge> : null}
            {membership.seatNumber !== null ? (
              <span className="text-xs text-ink-faint">Zetel {membership.seatNumber}</span>
            ) : null}
            <span className="text-xs text-ink-faint">{formatPeriod(membership.start, membership.end)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
