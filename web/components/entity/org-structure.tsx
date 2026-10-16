import { Avatar } from "@/components/avatar";
import { T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { BuildingIcon, PeopleIcon } from "@/components/entity/icons";
import { getPersonById, getPositionById } from "@/lib/data";
import { keyHolderRank, shortRole } from "@/lib/entity-page";
import type { Organization, Tenure } from "@/lib/types";

/** Key holders shown in the header; the rest sit in the officials section. */
const KEY_HOLDER_LIMIT = 3;

const HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-3 pointer-coarse:after:content-['']";

/**
 * Place in the state and who leads it, as compact rows. A missing part is
 * left out.
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
  const leading = holders
    .map((tenure) => ({ tenure, position: getPositionById(tenure.position), person: getPersonById(tenure.person) }))
    .filter((entry) => entry.position !== undefined && entry.person !== undefined)
    .map((entry) => ({ ...entry, rank: keyHolderRank(entry.position!.title) }))
    .filter((entry) => entry.rank < 9)
    .sort((a, b) => a.rank - b.rank);
  const shown = leading.slice(0, KEY_HOLDER_LIMIT);
  const more = holders.length - shown.length;
  if (parents.length === 0 && shown.length === 0) return null;
  return (
    <div className={`flex flex-col gap-2 text-sm ${className}`.trim()}>
      {parents.length > 0 ? (
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-faint">
            <BuildingIcon width={14} height={14} />
            <T area="entity" k="partOfTitle" />
          </span>
          {parents.map((parent) => (
            <EntityPeekLink key={parent.id} id={parent.id} glyph className={HIT} />
          ))}
        </p>
      ) : null}
      {shown.length > 0 ? (
        <p className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="inline-flex shrink-0 items-center gap-1 pe-1 text-xs text-ink-faint max-sm:basis-full">
            <PeopleIcon width={14} height={14} />
            <T area="entity" k="keyHoldersLabel" />
          </span>
          {shown.map(({ tenure, person, position }) => (
            <span
              key={tenure.id}
              className="relative inline-flex min-w-0 max-w-full items-center gap-1.5 py-0.5 pointer-coarse:min-h-11"
            >
              <Avatar name={person!.name} url={person!.portrait} size={18} className="shrink-0" />
              <EntityPeekLink id={person!.id} className={HIT}>
                {person!.name}
              </EntityPeekLink>
              <span className="truncate text-xs text-ink-faint">{shortRole(position!.title)}</span>
            </span>
          ))}
          {more > 0 ? (
            <a href="#functionarissen" className={`text-xs text-accent-text underline-offset-2 hover:underline ${HIT}`}>
              <T area="entity" k="holdersMore" vars={{ n: more }} />
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
