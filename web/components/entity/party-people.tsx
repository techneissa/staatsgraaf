import { T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import type { PartyPeopleGroup, PartyPerson } from "@/lib/entity-party";
import { SUMMARY_CLASS } from "./entity-connections";

/** People shown per group before the disclosure. */
const GROUP_LIMIT = 12;

const TITLE_KEYS: Record<PartyPeopleGroup["group"], string> = {
  bewindspersonen: "partyGroupBewind",
  fractievoorzitters: "partyGroupFractie",
  burgemeesters: "partyGroupMayors",
  bestuurders: "partyGroupBoards",
  anderen: "partyGroupOthers",
};

function Row({ entry }: { entry: PartyPerson }) {
  return (
    <li className="flex min-w-0 flex-wrap items-baseline gap-x-2 border-b border-line/60 py-2 pointer-coarse:py-3 last:border-b-0">
      <EntityPeekLink id={entry.person.id} variant="plain" glyph className="text-sm font-medium" />
      {entry.roles.slice(0, 2).map((role) => (
        <EntityPeekLink key={role.positionId} id={role.positionId} variant="quiet" className="text-xs" />
      ))}
    </li>
  );
}

/**
 * The people the dataset links to a party, in groups by their most senior
 * current role, each person a peek link. Long groups fold after a dozen.
 */
export function PartyPeople({ groups }: { groups: PartyPeopleGroup[] }) {
  return (
    <>
      {groups.map(({ group, people }) => (
        <section key={group} aria-labelledby={`party-${group}`} className="mt-6">
          <h2 id={`party-${group}`} className="border-b border-line pb-2 text-lg font-semibold tracking-tight text-ink">
            <T area="entity" k={TITLE_KEYS[group]} />
            <span className="ms-2 text-sm font-normal tabular-nums text-ink-faint">{people.length}</span>
          </h2>
          <ul className="mt-1 grid grid-cols-1 gap-x-6 md:grid-cols-2">
            {people.slice(0, GROUP_LIMIT).map((entry) => (
              <Row key={entry.person.id} entry={entry} />
            ))}
          </ul>
          {people.length > GROUP_LIMIT ? (
            <details className="motion-disclosure mt-2">
              <summary className={SUMMARY_CLASS}>
                <T area="common" k="seeAll" vars={{ n: people.length }} />
              </summary>
              <ul className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                {people.slice(GROUP_LIMIT).map((entry) => (
                  <Row key={entry.person.id} entry={entry} />
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ))}
    </>
  );
}
