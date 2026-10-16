import { PartyPill } from "@/components/party-pill";
import { DateT, LocalPeriod } from "@/components/content/local-date";
import { T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { PeekLink } from "@/components/peek/peek-link";
import { getDataset, getOrganizationById, getPositionById, getTenuresForPerson } from "@/lib/data";
import { branchColorVar } from "@/lib/branch-colors";
import type { MemberEntry } from "@/lib/entity";
import { keyHolderRank, roleLabel } from "@/lib/entity-page";
import type { Membership, Position } from "@/lib/types";
import { PersonPortrait, PersonPortraitCredit } from "./person-portrait";

/** Grow the title tap box without stretching the caption. */
const TITLE_HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-4 pointer-coarse:after:content-['']";

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
    const lidByOrg = new Map<string, Position | undefined>();
    return (
      <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-3">
        {members.map(({ membership, person }) => {
          if (!lidByOrg.has(membership.organization)) {
            lidByOrg.set(membership.organization, lidPositionFor(membership.organization));
          }
          const offices = officesFor(membership, lidByOrg.get(membership.organization));
          const body = getOrganizationById(membership.organization);
          const roleColor = body ? branchColorVar(body.branch) : "var(--kind-position)";
          return (
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
              {offices.map(({ position, start }) => (
                <span key={position.id} className="flex max-w-full flex-col items-center text-center leading-tight">
                  <EntityPeekLink
                    id={position.id}
                    variant="tinted"
                    className={`max-w-full text-[11px] leading-tight ${TITLE_HIT}`}
                    style={{ color: roleColor }}
                  >
                    {roleLabel(position.title)}
                  </EntityPeekLink>
                  {start ? (
                    <span className="text-[10px] leading-tight text-ink-faint">
                      <DateT area="panels" k="since" dates={{ date: start }} short />
                    </span>
                  ) : null}
                </span>
              ))}
            </li>
          );
        })}
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

/** The multi-seat "Lid van …" position of a chamber, when the dataset has one. */
function lidPositionFor(organizationId: string): Position | undefined {
  return getDataset().positions.find(
    (position) =>
      position.organization === organizationId &&
      /^Lid van /i.test(position.title) &&
      (position.seatsCount ?? 0) > 1,
  );
}

/**
 * Offices in this chamber: a fractievoorzitter or speaker tenure first, then
 * the member seat. Ordinary Kamerleden have a membership but no per-seat
 * tenure, so the lid position is attached from the body.
 */
function officesFor(
  membership: Membership,
  lid: Position | undefined,
): { position: Position; start: string | null }[] {
  const offices: { position: Position; start: string | null; rank: number }[] = [];
  const seen = new Set<string>();
  for (const tenure of getTenuresForPerson(membership.person)) {
    if (tenure.end !== null) continue;
    const position = getPositionById(tenure.position);
    if (position === undefined || position.organization !== membership.organization) continue;
    seen.add(position.id);
    offices.push({
      position,
      start: tenure.start ?? membership.start,
      rank: keyHolderRank(position.title),
    });
  }
  if (lid && !seen.has(lid.id)) {
    offices.push({ position: lid, start: membership.start, rank: keyHolderRank(lid.title) });
  }
  offices.sort((a, b) => a.rank - b.rank || a.position.title.localeCompare(b.position.title, "nl"));
  return offices;
}
