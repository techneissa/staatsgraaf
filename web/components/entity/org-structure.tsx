import { T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { getPersonById, getPositionById } from "@/lib/data";
import { keyHolderRank, shortRole } from "@/lib/entity-page";
import type { Organization, Tenure } from "@/lib/types";

/** Key holders shown in the structure row; the rest sit in the officials section. */
const KEY_HOLDER_LIMIT = 3;

/**
 * The first thing an organisation page says about its place in the state:
 * what it is part of, how many bodies sit under it (a link to the list) and
 * who leads it. Every part links onward; a part the data lacks is left out.
 */
export function OrgStructure({
  parents,
  childCount,
  holders,
}: {
  parents: Organization[];
  childCount: number;
  holders: Tenure[];
}) {
  const leading = holders
    .map((tenure) => ({ tenure, position: getPositionById(tenure.position), person: getPersonById(tenure.person) }))
    .filter((entry) => entry.position !== undefined && entry.person !== undefined)
    .map((entry) => ({ ...entry, rank: keyHolderRank(entry.position!.title) }))
    .filter((entry) => entry.rank < 9)
    .sort((a, b) => a.rank - b.rank);
  const shown = leading.slice(0, KEY_HOLDER_LIMIT);
  const more = holders.length - shown.length;
  if (parents.length === 0 && childCount === 0 && shown.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-1 text-sm">
      {parents.length > 0 ? (
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-xs text-ink-faint">
            <T area="entity" k="partOfTitle" />
          </span>
          {parents.map((parent) => (
            <EntityPeekLink key={parent.id} id={parent.id} glyph />
          ))}
        </p>
      ) : null}
      {childCount > 0 ? (
        <p>
          <a href="#onderdelen" className="tap-row inline-flex items-center font-medium text-accent-text underline-offset-2 hover:underline">
            <T area="entity" k={childCount === 1 ? "childrenCountOne" : "childrenCountMany"} vars={{ n: childCount }} />
          </a>
        </p>
      ) : null}
      {shown.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-xs text-ink-faint">
            <T area="entity" k="keyHoldersLabel" />
          </span>
          {shown.map(({ tenure, person, position }) => (
            <span key={tenure.id} className="min-w-0">
              <EntityPeekLink id={person!.id} glyph />
              <span className="ms-1 text-xs text-ink-faint">{shortRole(position!.title)}</span>
            </span>
          ))}
          {more > 0 ? (
            <a href="#functionarissen" className="tap-row inline-flex items-center text-xs text-accent-text underline-offset-2 hover:underline">
              <T area="entity" k="holdersMore" vars={{ n: more }} />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
