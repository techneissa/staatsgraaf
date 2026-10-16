import { PartyPill } from "@/components/party-pill";
import { DateT, LocalPeriod } from "@/components/content/local-date";
import { T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { PeekLink } from "@/components/peek/peek-link";
import type { MemberEntry } from "@/lib/entity";
import { PersonPortrait, PersonPortraitCredit } from "./person-portrait";

/**
 * Chamber members. `rows` is the dense list on organisation pages. `faces` is
 * the same layout as who leads (ADR 0017): a wrapping row of portraits, used
 * on party pages.
 */
export function MemberList({
  members,
  showParty = true,
  layout = "rows",
}: {
  members: MemberEntry[];
  showParty?: boolean;
  layout?: "rows" | "faces";
}) {
  if (members.length === 0) return null;
  if (layout === "faces") {
    return (
      <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-3">
        {members.map(({ membership, person }) => (
          <li key={membership.id} className="flex w-[calc(50%-0.25rem)] min-w-0 flex-col items-center sm:w-28">
            <EntityPeekLink
              id={person.id}
              variant="bare"
              className="flex w-full flex-col items-center gap-1 text-center"
            >
              <PersonPortrait person={person} size={48} />
              <span className="text-xs font-medium leading-tight">{person.name}</span>
            </EntityPeekLink>
            <PersonPortraitCredit person={person} />
            {showParty && membership.fractie !== null ? (
              <span className="mt-0.5">
                <PartyPill party={membership.fractie} />
              </span>
            ) : null}
            {membership.seatNumber !== null ? (
              <span className="text-[11px] leading-tight text-ink-faint">
                <T area="entity" k="seatNumber" vars={{ n: membership.seatNumber }} />
              </span>
            ) : null}
            <span className="text-[10px] leading-tight text-ink-faint">
              <DateT area="panels" k="since" dates={{ date: membership.start }} short />
            </span>
          </li>
        ))}
      </ul>
    );
  }
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
