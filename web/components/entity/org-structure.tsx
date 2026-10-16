import { PersonPortrait, PersonPortraitCredit } from "@/components/entity/person-portrait";
import { T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { BuildingIcon, PeopleIcon } from "@/components/entity/icons";
import { getOrganizationById, getPersonById, getPositionById } from "@/lib/data";
import { branchColorVar } from "@/lib/branch-colors";
import { keyHolderRank, roleLabel } from "@/lib/entity-page";
import type { Organization, Person, Position, Tenure } from "@/lib/types";

const HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-3 pointer-coarse:after:content-['']";

type HolderFace = {
  tenure: Tenure;
  person: Person;
  position: Position;
  rank: number;
};

/** One face per person, senior role first. Rank 9 (ordinary members) stay in the officials list. */
function leadingFaces(holders: Tenure[]): HolderFace[] {
  const ranked: HolderFace[] = [];
  for (const tenure of holders) {
    const position = getPositionById(tenure.position);
    const person = getPersonById(tenure.person);
    if (position === undefined || person === undefined) continue;
    const rank = keyHolderRank(position.title);
    if (rank >= 9) continue;
    ranked.push({ tenure, person, position, rank });
  }
  ranked.sort((a, b) => a.rank - b.rank);
  const seen = new Set<string>();
  const unique: HolderFace[] = [];
  for (const entry of ranked) {
    if (seen.has(entry.person.id)) continue;
    seen.add(entry.person.id);
    unique.push(entry);
  }
  return unique;
}

/**
 * Place in the state and who leads it. Parents as a line; people as a row of
 * faces (layout C). A missing part is left out. Every leading person is shown.
 */
export function OrgStructure({
  parents,
  holders,
  className = "mt-3",
}: {
  parents: Organization[];
  holders: Tenure[];
  className?: string;
}) {
  const faces = leadingFaces(holders);
  if (parents.length === 0 && faces.length === 0) return null;
  return (
    <div className={`flex flex-col gap-3 text-sm ${className}`.trim()}>
      {parents.length > 0 ? (
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-faint">
            <BuildingIcon width={14} height={14} />
            <T area="entity" k="partOfTitle" />
          </span>
          {parents.map((parent) => (
            <EntityPeekLink key={parent.id} id={parent.id} glyph variant="bare" className={HIT} />
          ))}
        </p>
      ) : null}
      {faces.length > 0 ? (
        <div>
          <p className="mb-3 inline-flex items-center gap-1 text-xs text-ink-faint">
            <PeopleIcon width={14} height={14} />
            <T area="entity" k="keyHoldersLabel" />
          </p>
          <ul className="flex flex-wrap gap-x-2 gap-y-3">
            {faces.map(({ person, position }) => {
              const body = getOrganizationById(position.organization);
              const roleColor = body ? branchColorVar(body.branch) : "var(--kind-position)";
              return (
                <li
                  key={person.id}
                  className="flex w-[calc(50%-0.25rem)] min-w-0 flex-col items-center sm:w-28"
                >
                  <EntityPeekLink
                    id={person.id}
                    variant="bare"
                    className="flex w-full min-h-11 flex-col items-center gap-1.5 text-center"
                  >
                    <PersonPortrait person={person} size={48} />
                    <span className="text-xs font-medium leading-snug">{person.name}</span>
                  </EntityPeekLink>
                  <PersonPortraitCredit person={person} />
                  <EntityPeekLink
                    id={position.id}
                    variant="tinted"
                    className={`mt-0.5 max-w-full text-center text-[11px] leading-snug pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center ${HIT}`}
                    style={{ color: roleColor }}
                  >
                    {roleLabel(position.title)}
                  </EntityPeekLink>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
