import Link from "next/link";
import { KindBadge } from "@/components/kind-badge";
import { T } from "@/components/i18n/t";
import { PersonPortrait, PersonPortraitCredit } from "./person-portrait";
import type { MemberEntry } from "@/lib/entity";

export function SeatGrid({ members, limit }: { members: MemberEntry[]; limit?: number }) {
  const visible = limit !== undefined ? members.slice(0, limit) : members;
  if (visible.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {visible.map(({ membership, person }) => (
        <li key={membership.id}>
          <Link
            href={`/personen/${person.slug}/`}
            className="flex h-full flex-col items-center rounded-md border border-line bg-surface p-3 text-center transition-fast hover:border-line-strong"
          >
            <PersonPortrait person={person} size={56} />
            <span className="mt-2 block text-sm font-semibold text-ink">{person.name}</span>
            <PersonPortraitCredit
              person={person}
              className="mt-1 block max-w-[12rem] text-[10px] leading-tight text-ink-faint"
            />
            {membership.fractie !== null ? (
              <span className="mt-1.5 block">
                <KindBadge>{membership.fractie}</KindBadge>
              </span>
            ) : null}
            {membership.seatNumber !== null ? (
              <span className="mt-1 block text-xs text-ink-faint">
                <T area="entity" k="seatNumber" vars={{ n: membership.seatNumber }} />
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
