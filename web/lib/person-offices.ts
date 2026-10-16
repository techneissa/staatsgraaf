import { getDataset, getPositionById } from "./data";
import { keyHolderRank } from "./entity-page";
import type { Membership, Position, Tenure } from "./types";

export type PersonOffice = { position: Position; start: string | null };

/**
 * Current offices for a person header: senior tenures first, then a chamber
 * seat that only exists as a membership. Committee member seats stay in the
 * positions list below.
 */
export function currentPersonOffices(tenures: Tenure[], memberships: Membership[]): PersonOffice[] {
  const offices: { position: Position; start: string | null; rank: number }[] = [];
  const seen = new Set<string>();
  for (const tenure of tenures) {
    if (tenure.end !== null) continue;
    const position = getPositionById(tenure.position);
    if (position === undefined) continue;
    seen.add(position.id);
    offices.push({ position, start: tenure.start, rank: keyHolderRank(position.title) });
  }
  const leading = offices.filter((office) => office.rank < 9);
  const shown = leading.length > 0 ? leading : offices;
  for (const membership of memberships) {
    if (membership.end !== null) continue;
    const lid = lidPositionFor(membership.organization);
    if (lid === undefined || seen.has(lid.id)) continue;
    seen.add(lid.id);
    shown.push({ position: lid, start: membership.start, rank: keyHolderRank(lid.title) });
  }
  shown.sort((a, b) => a.rank - b.rank || a.position.title.localeCompare(b.position.title, "nl"));
  return shown;
}

function lidPositionFor(organizationId: string): Position | undefined {
  return getDataset().positions.find(
    (position) =>
      position.organization === organizationId &&
      /^Lid van /i.test(position.title) &&
      (position.seatsCount ?? 0) > 1,
  );
}
