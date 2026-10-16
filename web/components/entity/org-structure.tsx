import { DateT } from "@/components/content/local-date";
import { PersonPortrait, PersonPortraitCredit } from "@/components/entity/person-portrait";
import { T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { BuildingIcon, PeopleIcon } from "@/components/entity/icons";
import { getOrganizationById, getPersonById, getPositionById } from "@/lib/data";
import { branchColorVar } from "@/lib/branch-colors";
import { groupHoldersByPerson, isLeadingRole, keyHolderRank, roleLabel } from "@/lib/entity-page";
import type { Organization, Person, Position, Tenure } from "@/lib/types";

const HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-3 pointer-coarse:after:content-['']";
/** Grow the title tap box without stretching the caption. */
const TITLE_HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-4 pointer-coarse:after:content-['']";

type HolderFace = {
  personId: string;
  tenure: Tenure;
  person: Person;
  position: Position;
  rank: number;
};

/** One face per person, senior role first. Ordinary members stay in the members list. */
function leadingFaces(holders: Tenure[]): HolderFace[][] {
  const ranked: HolderFace[] = [];
  for (const tenure of holders) {
    const position = getPositionById(tenure.position);
    const person = getPersonById(tenure.person);
    if (position === undefined || person === undefined) continue;
    if (!isLeadingRole(position.title)) continue;
    ranked.push({ personId: person.id, tenure, person, position, rank: keyHolderRank(position.title) });
  }
  ranked.sort((a, b) => a.rank - b.rank || a.person.name.localeCompare(b.person.name, "nl"));
  return groupHoldersByPerson(ranked);
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
            {faces.map((roles) => {
              const lead = roles[0];
              if (lead === undefined) return null;
              const person = lead.person;
              const body = getOrganizationById(lead.position.organization);
              const roleColor = body ? branchColorVar(body.branch) : "var(--kind-position)";
              return (
                <li
                  key={person.id}
                  className="flex w-[calc(50%-0.25rem)] min-w-0 flex-col items-center sm:w-28"
                >
                  <EntityPeekLink
                    id={person.id}
                    variant="bare"
                    className="flex w-full flex-col items-center gap-1 text-center"
                  >
                    <PersonPortrait person={person} size={48} />
                    <span className="text-xs font-medium leading-tight">{person.name}</span>
                  </EntityPeekLink>
                  <PersonPortraitCredit person={person} />
                  {roles.map(({ tenure, position }) => (
                    <span key={tenure.id} className="flex max-w-full flex-col items-center text-center leading-tight">
                      <EntityPeekLink
                        id={position.id}
                        variant="tinted"
                        className={`max-w-full text-[11px] leading-tight ${TITLE_HIT}`}
                        style={{ color: roleColor }}
                      >
                        {roleLabel(position.title)}
                      </EntityPeekLink>
                      {tenure.start ? (
                        <span className="text-[10px] leading-tight text-ink-faint">
                          <DateT area="panels" k="since" dates={{ date: tenure.start }} short />
                        </span>
                      ) : null}
                    </span>
                  ))}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
