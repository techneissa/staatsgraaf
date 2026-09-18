import { EmptyStateT } from "@/components/change/empty-state-t";
import { SourceLink } from "@/components/source-link";
import { L, T } from "@/components/i18n/t";
import { getOrganizationById, getPositionById, getSourceById } from "@/lib/data";
import {
  groupConnections,
  getRelationById,
  type Connection,
  type ConnectionGroup,
} from "@/lib/entity";
import { EntityDot } from "./entity-dot";
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

function iconFor(type: ConnectionGroup["type"]) {
  switch (type) {
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
  if (appointed === 0 && total === null) return null;
  return { appointed, total };
}

/** Subtitle under the entity name: the organization for a position. */
function contextLabel(connection: Connection): string | null {
  if (connection.other.kind === "position") {
    const position = getPositionById(connection.other.id);
    if (!position) return null;
    return getOrganizationById(position.organization)?.name ?? null;
  }
  if (connection.other.kind === "organization") {
    return getOrganizationById(connection.other.id)?.name ?? null;
  }
  return null;
}

function ConnectionCard({
  connection,
  showDirection,
}: {
  connection: Connection;
  showDirection: boolean;
}) {
  const source = getSourceById(connection.source.source);
  const seats = seatLine(connection);
  const context = contextLabel(connection);
  return (
    <article className="flex items-center gap-x-2.5 rounded-md border border-line bg-surface px-2.5 py-2 transition-fast hover:border-line-strong">
      <span className="flex shrink-0 items-center gap-1.5">
        <EntityDot kind={connection.other.kind} id={connection.other.id} />
        {connection.other.kind === "person" ? (
          <PersonIcon width={15} height={15} className="text-ink-muted" />
        ) : connection.other.kind === "position" ? (
          <ClipboardIcon width={15} height={15} className="text-ink-muted" />
        ) : (
          <BuildingIcon width={15} height={15} className="text-ink-muted" />
        )}
      </span>
      <a
        href={connection.other.href}
        className="min-w-0 flex-1 text-sm text-ink underline-offset-2 hover:text-accent-text hover:underline"
      >
        <span className="block truncate font-medium">{connection.other.name}</span>
        <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs text-ink-faint">
          {showDirection ? (
            <span aria-hidden="true">{connection.direction === "outgoing" ? "\u2192" : "\u2190"}</span>
          ) : null}
          <span className="sr-only">
            {connection.direction === "outgoing" ? (
              <L nl="Uitgaande relatie naar" en="Outgoing connection to" />
            ) : (
              <L nl="Inkomende relatie van" en="Incoming connection from" />
            )}{" "}
            {connection.other.name}
          </span>
          {context !== null ? <span className="truncate">{context}</span> : null}
          {seats !== null ? (
            <span className="tabular-nums">
              {seats.total !== null ? (
                <T area="common" k="seatsCountLabel" vars={{ n: seats.appointed, total: seats.total }} />
              ) : (
                <T area="common" k="seatsOfLabel" vars={{ n: seats.appointed }} />
              )}
            </span>
          ) : null}
        </span>
      </a>
      {source ? (
        <span className="shrink-0">
          <SourceLink href={source.url} meta={source.publisher}>
            <L nl="Bron" en="Source" />
          </SourceLink>
        </span>
      ) : null}
    </article>
  );
}

function ConnectionGroupBlock({
  group,
  showDirection,
}: {
  group: ConnectionGroup;
  showDirection: boolean;
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
    >
      {visible.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visible.map((connection) => (
            <li key={connection.id}>
              <ConnectionCard connection={connection} showDirection={showDirection} />
            </li>
          ))}
        </ul>
      ) : null}
      {rest.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer list-none rounded-sm border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink transition-fast hover:border-line-strong">
            <T area="common" k="seeAll" vars={{ n: group.connections.length }} />
          </summary>
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rest.map((connection) => (
              <li key={connection.id}>
                <ConnectionCard connection={connection} showDirection={showDirection} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </FactGroup>
  );
}

export function EntityConnections({ connections }: { connections: Connection[] }) {
  if (connections.length === 0) {
    return (
      <EmptyStateT
        area="entity"
        title="noConnectionsTitle"
        description="noConnectionsNote"
      />
    );
  }

  const groups = groupConnections(connections);
  const composed = groups.map((group) => {
    const directions = new Set(group.connections.map((connection) => connection.direction));
    return { group, showDirection: directions.size > 1 };
  });
  const order = new Set<ConnectionGroup["type"]>([
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
    <div className="space-y-4">
      {composed.map(({ group, showDirection }) => (
        <ConnectionGroupBlock key={group.type} group={group} showDirection={showDirection} />
      ))}
    </div>
  );
}
