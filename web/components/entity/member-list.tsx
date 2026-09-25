import { PartyPill } from "@/components/party-pill";
import { LocalPeriod } from "@/components/content/local-date";
import { T } from "@/components/i18n/t";
import { PeekLink } from "@/components/peek/peek-link";
import type { MemberEntry } from "@/lib/entity";
import { PersonPortrait, PersonPortraitCredit } from "./person-portrait";

/** Members as calm rows: portrait or initials, the name as a peek link, fractie, seat and period. */
export function MemberList({ members, showParty = true }: { members: MemberEntry[]; showParty?: boolean }) {
  if (members.length === 0) return null;
  return (
    <ol className="divide-y divide-line/60">
      {members.map(({ membership, person }) => (
        <li key={membership.id} className="flex items-start gap-3 py-2">
          <PersonPortrait person={person} size={36} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div>
              <PeekLink
                id={person.id}
                href={`/personen/${person.slug}/`}
                kind="person"
                variant="plain"
                className="text-sm font-medium"
              >
                {person.name}
              </PeekLink>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                {showParty && membership.fractie !== null ? <PartyPill party={membership.fractie} /> : null}
                {membership.seatNumber !== null ? (
                  <span className="text-xs text-ink-faint">
                    <T area="entity" k="seatNumber" vars={{ n: membership.seatNumber }} />
                  </span>
                ) : null}
                <span className="text-xs text-ink-faint">
                  <LocalPeriod start={membership.start} end={membership.end} short />
                </span>
              </span>
            </div>
            <PersonPortraitCredit person={person} className="mt-0.5 block text-[10px] leading-tight text-ink-faint" />
          </div>
        </li>
      ))}
    </ol>
  );
}
