import { getOrganizationById, getPersonById, getPositionById } from "@/lib/data";
import { branchColorVar } from "@/lib/branch-colors";
import { partyByDataset } from "@/lib/parties";
import type { EntityKind } from "@/lib/entity";

const NEUTRAL = "var(--t-color-line-strong)";

/**
 * A small coloured identity dot for an entity reference: the branch colour for
 * organizations (and positions, via their organization) and the official party
 * colour for people. Falls back to the neutral line colour, never an invented
 * value.
 */
export function EntityDot({ kind, id }: { kind: EntityKind; id: string }) {
  let color = NEUTRAL;
  if (kind === "organization") {
    const organization = getOrganizationById(id);
    color = organization ? branchColorVar(organization.branch) : NEUTRAL;
  } else if (kind === "position") {
    const position = getPositionById(id);
    const organization = position ? getOrganizationById(position.organization) : undefined;
    color = organization ? branchColorVar(organization.branch) : NEUTRAL;
  } else {
    const person = getPersonById(id);
    if (person) {
      const party = partyByDataset(person.party);
      if (party?.color) color = party.color;
    }
  }
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-line"
      style={{ backgroundColor: color }}
    />
  );
}
