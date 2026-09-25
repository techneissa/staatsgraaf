import { SourceIcon } from "@/components/source-icon";
import { L, T } from "@/components/i18n/t";
import { KindGlyph } from "@/components/kind-glyph";
import { PartyBadge } from "@/components/party-badge";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { PeekLink } from "@/components/peek/peek-link";
import { getOrganizationById, getPersonById, getPositionById, getSourceById } from "@/lib/data";
import { peekKindFor, type PeekKind } from "@/lib/peek";
import { PersonPortrait } from "./person-portrait";
import {
  groupConnections,
  getRelationById,
  type Connection,
  type ConnectionGroup,
} from "@/lib/entity";
import { FactGroup } from "./fact-group";
import {
  AdviceIcon,
  BuildingIcon,
  ClipboardIcon,
  GavelIcon,
  HandshakeIcon,
  LinkIcon,
  PeopleIcon,
  PersonIcon,
  ScaleIcon,
  SeatIcon,
} from "./icons";

const GROUP_LIMIT = 8;

const LIST_CLASS = "grid grid-cols-1 gap-x-6 md:grid-cols-2 lg:grid-cols-1";

/** A quiet text toggle; 44 px tall on touch screens. */
export const SUMMARY_CLASS =
  "inline-flex cursor-pointer list-none items-center rounded-sm py-1.5 text-xs font-medium text-accent-text underline-offset-2 transition-fast hover:underline pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden";

function iconFor(type: ConnectionGroup["type"]) {
  switch (type) {
    case "holds_position":
      return <ClipboardIcon />;
    case "member_of":
      return <PeopleIcon />;
    case "elects":
      return <PeopleIcon />;
    case "appoints":
      return <SeatIcon />;
    case "advises":
      return <AdviceIcon />;
    case "oversees":
      return <ScaleIcon />;
    case "ex_officio":
      return <ClipboardIcon />;
    case "confirms":
      return <GavelIcon />;
    case "dept_head":
      return <PersonIcon />;
    case "part_of":
    case "consists_of":
    case "succeeded_by":
    case "joint_arrangement_member":
      return <LinkIcon />;
    case "administers":
    case "subsidises":
      return <HandshakeIcon />;
    default:
      return <BuildingIcon />;
  }
}

const GROUP_TITLES: Record<ConnectionGroup["type"], { nl: string; en: string }> = {
  holds_position: { nl: "Positie", en: "Position" },
  member_of: { nl: "Lidmaatschap", en: "Membership" },
  elects: { nl: "Verkiezing", en: "Election" },
  appoints: { nl: "Benoeming", en: "Appointment" },
  oversees: { nl: "Toezicht", en: "Oversight" },
  advises: { nl: "Advies", en: "Advice" },
  office: { nl: "Positie bij", en: "Position at" },
  dept_head: { nl: "Hoofdpositie", en: "Head position" },
  confirms: { nl: "Bekrachtiging", en: "Confirmation" },
  ex_officio: { nl: "Van rechtswege", en: "By virtue of office" },
  administers: { nl: "Uitvoering", en: "Administration" },
  subsidises: { nl: "Subsidie", en: "Subsidy" },
  accountable_to: { nl: "Verantwoording", en: "Accountability" },
  part_of: { nl: "Onderdeel van", en: "Part of" },
  consists_of: { nl: "Samenstelling", en: "Composition" },
  succeeded_by: { nl: "Opvolging", en: "Succession" },
  joint_arrangement_member: { nl: "Gemeenschappelijke regeling", en: "Joint arrangement" },
};

/** CivLab-style viewpoint-aware group title: "Gekozen door", "Benoemt", and so on. */
function groupTitle(group: ConnectionGroup): { nl: string; en: string } | null {
  const directions = new Set(group.connections.map((connection) => connection.direction));
  if (directions.size !== 1) return null;
  const incoming = [...directions][0] === "incoming";
  switch (group.type) {
    case "holds_position":
      return incoming
        ? { nl: "Bekleed door", en: "Held by" }
        : { nl: "Bekleedt positie", en: "Holds position" };
    case "member_of":
      return incoming ? { nl: "Leden", en: "Members" } : { nl: "Lid van", en: "Member of" };
    case "elects":
      return incoming ? { nl: "Gekozen door", en: "Elected by" } : { nl: "Kiest", en: "Elects" };
    case "appoints":
      return incoming ? { nl: "Wordt benoemd door", en: "Appointed by" } : { nl: "Benoemt", en: "Appoints" };
    case "advises":
      return incoming ? { nl: "Geadviseerd door", en: "Advised by" } : { nl: "Adviseert", en: "Advises" };
    case "oversees":
      return incoming ? { nl: "Onder toezicht van", en: "Overseen by" } : { nl: "Houdt toezicht op", en: "Oversees" };
    default:
      return GROUP_TITLES[group.type];
  }
}

/** Seat metadata for one connection, from the raw relation plus the target entity. */
function seatLine(connection: Connection): { appointed: number; total: number | null } | null {
  const relation = getRelationById(connection.id);
  const appointed = relation?.seatsAppointed ?? null;
  if (typeof appointed !== "number") return null;
  let total: number | null = null;
  if (connection.other.kind === "position") {
    total = getPositionById(connection.other.id)?.seatsCount ?? null;
  } else if (connection.other.kind === "organization") {
    total = getOrganizationById(connection.other.id)?.seatsCount ?? null;
  }
  // "0 of 1 seats" tells a reader nothing; show a seat line only when seats are appointed.
  if (appointed === 0) return null;
  return { appointed, total };
}

/** Peek kind for the other end of a connection (a gemeente or provincie is a place). */
function peekKindOf(connection: Connection): PeekKind {
  if (connection.other.kind === "organization") {
    return peekKindFor(connection.other.id, getOrganizationById(connection.other.id)?.subtype ?? null) ?? "organization";
  }
  return connection.other.kind;
}

/** Muted context under the name: the organisation of a position, the type of an organisation, the party of a person. */
function ContextLine({ connection, selfId }: { connection: Connection; selfId?: string }) {
  if (connection.other.kind === "position") {
    const position = getPositionById(connection.other.id);
    if (!position || position.organization === selfId) return null;
    return <EntityPeekLink id={position.organization} variant="quiet" />;
  }
  if (connection.other.kind === "organization") {
    const organization = getOrganizationById(connection.other.id);
    return organization ? <LocaleLabel kind="subtype" value={organization.subtype} /> : null;
  }
  const person = getPersonById(connection.other.id);
  return person?.party ? <PartyBadge party={person.party} /> : null;
}

function ConnectionRow({
  connection,
  showDirection,
  selfId,
}: {
  connection: Connection;
  showDirection: boolean;
  selfId?: string;
}) {
  const source = getSourceById(connection.source.source);
  const seats = seatLine(connection);
  const kind = peekKindOf(connection);
  const person = connection.other.kind === "person" ? getPersonById(connection.other.id) : undefined;
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden="true">
        {person ? <PersonPortrait person={person} size={24} /> : <KindGlyph kind={kind} size={9} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          {showDirection ? (
            <span aria-hidden="true" className="me-1 text-ink-faint">
              {connection.direction === "outgoing" ? "\u2192" : "\u2190"}
            </span>
          ) : null}
          {showDirection ? (
            <span className="sr-only">
              {connection.direction === "outgoing" ? (
                <L nl="Uitgaande relatie naar" en="Outgoing connection to" />
              ) : (
                <L nl="Inkomende relatie van" en="Incoming connection from" />
              )}{" "}
            </span>
          ) : null}
          <PeekLink
            id={connection.other.id}
            href={connection.other.href}
            kind={kind}
            variant="plain"
            className="font-medium"
          >
            {connection.other.name}
          </PeekLink>
        </p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-ink-faint">
          <ContextLine connection={connection} selfId={selfId} />
          {seats !== null ? (
            <span className="tabular-nums">
              {seats.total !== null ? (
                <T area="common" k="seatsCountLabel" vars={{ n: seats.appointed, total: seats.total }} />
              ) : (
                <T area="common" k="seatsOfLabel" vars={{ n: seats.appointed }} />
              )}
            </span>
          ) : null}
          {source ? (
            <SourceIcon href={source.url} title={source.title} retrieved={connection.source.retrieved} className="self-center" />
          ) : null}
        </p>
      </div>
    </div>
  );
}

function ConnectionGroupBlock({
  group,
  showDirection,
  selfId,
}: {
  group: ConnectionGroup;
  showDirection: boolean;
  selfId?: string;
}) {
  const connections = [...group.connections].sort((a, b) => {
    if ((a.direction === "outgoing" ? 0 : 1) !== (b.direction === "outgoing" ? 0 : 1)) {
      return (a.direction === "outgoing" ? 0 : 1) - (b.direction === "outgoing" ? 0 : 1);
    }
    return a.other.name.localeCompare(b.other.name, "nl");
  });
  const visible = connections.slice(0, GROUP_LIMIT);
  const rest = connections.slice(GROUP_LIMIT);
  const title = groupTitle(group) ?? GROUP_TITLES[group.type];
  return (
    <FactGroup
      icon={iconFor(group.type)}
      title={<L nl={title.nl} en={title.en} />}
      count={connections.length}
      plain
    >
      {visible.length > 0 ? (
        <ul className={LIST_CLASS}>
          {visible.map((connection) => (
            <li key={connection.id} className="border-b border-line/60 last:border-b-0">
              <ConnectionRow connection={connection} showDirection={showDirection} selfId={selfId} />
            </li>
          ))}
        </ul>
      ) : null}
      {rest.length > 0 ? (
        <details className="motion-disclosure mt-2">
          <summary className={SUMMARY_CLASS}>
            <T area="common" k="seeAll" vars={{ n: group.connections.length }} />
          </summary>
          <ul className={`mt-1 ${LIST_CLASS}`}>
            {rest.map((connection) => (
              <li key={connection.id} className="border-b border-line/60 last:border-b-0">
                <ConnectionRow connection={connection} showDirection={showDirection} selfId={selfId} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </FactGroup>
  );
}

/** `selfId` is the entity the page is about, so rows do not repeat it as context. */
export function EntityConnections({ connections, selfId }: { connections: Connection[]; selfId?: string }) {
  if (connections.length === 0) {
    return (
      <p className="text-sm text-ink-faint">
        <T area="entity" k="noConnectionsTitle" />
      </p>
    );
  }

  const groups = groupConnections(connections);
  const composed = groups.map((group) => {
    const directions = new Set(group.connections.map((connection) => connection.direction));
    return { group, showDirection: directions.size > 1 };
  });
  const order = new Set<ConnectionGroup["type"]>([
    "holds_position",
    "member_of",
    "elects",
    "appoints",
    "oversees",
    "advises",
    "ex_officio",
    "dept_head",
    "office",
  ]);
  composed.sort((a, b) => {
    const aKey = order.has(a.group.type) ? 0 : 1;
    const bKey = order.has(b.group.type) ? 0 : 1;
    if (aKey !== bKey) return aKey - bKey;
    return a.group.label.localeCompare(b.group.label, "nl");
  });

  return (
    <div className="space-y-5">
      {composed.map(({ group, showDirection }) => (
        <ConnectionGroupBlock key={group.type} group={group} showDirection={showDirection} selfId={selfId} />
      ))}
    </div>
  );
}
