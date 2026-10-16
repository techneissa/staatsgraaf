import { DateT } from "@/components/content/local-date";
import { T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { getOrganizationById, getPositionById } from "@/lib/data";
import { branchColorVar } from "@/lib/branch-colors";
import type { PartyPeopleGroup, PartyPerson } from "@/lib/entity-party";
import { PersonPortrait, PersonPortraitCredit } from "./person-portrait";
import { SUMMARY_CLASS } from "./entity-connections";

/** People shown per group before the disclosure. */
const GROUP_LIMIT = 12;

/** Grow the title tap box without stretching the caption. */
const TITLE_HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-4 pointer-coarse:after:content-['']";

const TITLE_KEYS: Record<PartyPeopleGroup["group"], string> = {
  bewindspersonen: "partyGroupBewind",
  fractievoorzitters: "partyGroupFractie",
  burgemeesters: "partyGroupMayors",
  bestuurders: "partyGroupBoards",
  anderen: "partyGroupOthers",
};

function Face({ entry }: { entry: PartyPerson }) {
  const lead = entry.roles[0];
  const leadPosition = lead ? getPositionById(lead.positionId) : undefined;
  const body = leadPosition ? getOrganizationById(leadPosition.organization) : undefined;
  const roleColor = body ? branchColorVar(body.branch) : "var(--kind-position)";
  return (
    <li className="flex w-[calc(50%-0.25rem)] min-w-0 flex-col items-center sm:w-28">
      <EntityPeekLink
        id={entry.person.id}
        variant="bare"
        className="flex w-full flex-col items-center gap-1 text-center"
      >
        <PersonPortrait person={entry.person} size={48} />
        <span className="text-xs font-medium leading-tight">{entry.person.name}</span>
      </EntityPeekLink>
      <PersonPortraitCredit person={entry.person} />
      {entry.roles.map((role) => (
        <span key={role.positionId} className="flex max-w-full flex-col items-center text-center leading-tight">
          <EntityPeekLink
            id={role.positionId}
            variant="tinted"
            className={`max-w-full break-words text-[11px] leading-tight ${TITLE_HIT}`}
            style={{ color: roleColor }}
          />
          {role.start ? (
            <span className="text-[10px] leading-tight text-ink-faint">
              <DateT area="panels" k="since" dates={{ date: role.start }} short />
            </span>
          ) : null}
        </span>
      ))}
    </li>
  );
}

function FaceGrid({ people }: { people: PartyPerson[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-3">
      {people.map((entry) => (
        <Face key={entry.person.id} entry={entry} />
      ))}
    </ul>
  );
}

/**
 * The people the dataset links to a party, in groups by their most senior
 * current role. Each person is a face: portrait, name, position, start date.
 * Long groups fold after a dozen.
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
          <FaceGrid people={people.slice(0, GROUP_LIMIT)} />
          {people.length > GROUP_LIMIT ? (
            <details className="motion-disclosure mt-2">
              <summary className={SUMMARY_CLASS}>
                <T area="common" k="seeAll" vars={{ n: people.length }} />
              </summary>
              <FaceGrid people={people.slice(GROUP_LIMIT)} />
            </details>
          ) : null}
        </section>
      ))}
    </>
  );
}
