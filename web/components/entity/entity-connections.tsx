import { T } from "@/components/i18n/t";
import { KindGlyph } from "@/components/kind-glyph";
import { PartyBadge } from "@/components/party-badge";
import { SubtypeLabel } from "./subtype-label";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { PeekLink } from "@/components/peek/peek-link";
import { getOrganizationById, getPersonById, getPositionById } from "@/lib/data";
import { peekKindFor, type PeekKind } from "@/lib/peek";
import { PersonPortrait } from "./person-portrait";
import {
  entityRefById,
  getRelationById,
  type Connection,
  type ConnectionType,
  type EntityKind,
} from "@/lib/entity";
import {
  splitConnectionTree,
  type ConnectionBranch,
  type ConnectionRowModel,
} from "@/lib/entity-rows";

const GROUP_LIMIT = 8;

/** A quiet text toggle; 44 px tall on touch screens. */
export const SUMMARY_CLASS =
  "inline-flex cursor-pointer list-none items-center rounded-sm py-1.5 text-xs font-medium text-accent-text underline-offset-2 transition-fast hover:underline pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden";

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
    return <EntityPeekLink id={position.organization} variant="bare" className="text-xs text-ink-faint" />;
  }
  if (connection.other.kind === "organization") {
    const organization = getOrganizationById(connection.other.id);
    return organization ? <SubtypeLabel value={organization.subtype} /> : null;
  }
  const person = getPersonById(connection.other.id);
  return person?.party ? <PartyBadge party={person.party} /> : null;
}

function treeRoleKey(type: ConnectionType, direction: Connection["direction"]): string | null {
  switch (type) {
    case "dept_head":
      return "treeRoleHead";
    case "office":
      return "treeRoleOffice";
    case "part_of":
      return "treeRolePart";
    case "consists_of":
      return "treeRoleComposition";
    case "oversees":
      return "treeRoleOversight";
    case "advises":
      return direction === "incoming" ? "treeRoleAdvisedBy" : "treeRoleAdvice";
    case "member_of":
      return direction === "incoming" ? "treeRoleMember" : "treeRoleMemberOf";
    case "holds_position":
      return direction === "incoming" ? "treeRoleHeldBy" : "treeRoleHolds";
    case "appoints":
      return "treeRoleAppoints";
    case "elects":
      return "treeRoleElects";
    case "confirms":
      return "treeRoleConfirms";
    case "joint_arrangement_member":
      return "treeRoleJoint";
    case "succeeded_by":
      return "treeRoleSuccession";
    case "administers":
      return "treeRoleAdmin";
    case "subsidises":
      return "treeRoleSubsidy";
    case "accountable_to":
      return "treeRoleAccountable";
    case "ex_officio":
      return "treeRoleExOfficio";
    default:
      return null;
  }
}

function hubCaptionKey(kind: EntityKind): string {
  if (kind === "person") return "treeThisPerson";
  if (kind === "position") return "treeThisPosition";
  return "treeThisOrganization";
}

/**
 * One connection row. The name is the only control; sources live on the
 * page SourceList. Names are clickable and never underlined.
 */
function ConnectionRow({
  row,
  selfId,
  roleKey,
}: {
  row: ConnectionRowModel;
  selfId?: string;
  roleKey?: string | null;
}) {
  const connection = row.connections[0];
  const seats = row.connections.length === 1 ? seatLine(connection) : null;
  const kind = peekKindOf(connection);
  const person = connection.other.kind === "person" ? getPersonById(connection.other.id) : undefined;
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center pointer-coarse:mt-[11px]" aria-hidden="true">
        {person ? <PersonPortrait person={person} size={24} /> : <KindGlyph kind={kind} size={9} />}
      </span>
      <div className="min-w-0 flex-1 py-1.5 pointer-coarse:py-0">
        <p className="text-sm font-medium leading-snug">
          <PeekLink
            id={connection.other.id}
            href={connection.other.href}
            kind={kind}
            variant="bare"
            className="min-w-0 break-words pointer-coarse:inline-block pointer-coarse:py-3.5"
          >
            {connection.other.name}
          </PeekLink>
        </p>
        <p className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-ink-faint pointer-coarse:pb-2">
          {roleKey ? <T area="entity" k={roleKey} /> : null}
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
        </p>
      </div>
    </div>
  );
}

function BranchList({
  branch,
  selfId,
  showRole,
}: {
  branch: ConnectionBranch;
  selfId?: string;
  showRole: boolean;
}) {
  const roleKey = showRole ? treeRoleKey(branch.type, branch.direction) : null;
  const visible = branch.rows.slice(0, GROUP_LIMIT);
  const rest = branch.rows.slice(GROUP_LIMIT);
  return (
    <>
      {visible.map((row) => (
        <li key={row.key} className="min-w-0">
          <ConnectionRow row={row} selfId={selfId} roleKey={roleKey} />
        </li>
      ))}
      {rest.length > 0 ? (
        <li className="min-w-0">
          <details className="motion-disclosure">
            <summary className={SUMMARY_CLASS}>
              <T area="common" k="seeAll" vars={{ n: branch.rows.length }} />
            </summary>
            <ul>
              {rest.map((row) => (
                <li key={row.key} className="min-w-0">
                  <ConnectionRow row={row} selfId={selfId} roleKey={roleKey} />
                </li>
              ))}
            </ul>
          </details>
        </li>
      ) : null}
    </>
  );
}

function Hub({ name, kind }: { name: string; kind: EntityKind }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center pointer-coarse:mt-[11px]" aria-hidden="true">
        <span className="size-2 rounded-full bg-accent-text" />
      </span>
      <div className="min-w-0 flex-1 py-1.5">
        <p className="text-sm font-medium leading-snug text-ink-muted break-words">{name}</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          <T area="entity" k={hubCaptionKey(kind)} />
        </p>
      </div>
    </div>
  );
}

/** `selfId` is the entity the page is about. `contextId` hides a repeated parent on position rows. */
export function EntityConnections({
  connections,
  selfId,
  contextId,
}: {
  connections: Connection[];
  selfId?: string;
  contextId?: string;
}) {
  if (connections.length === 0) {
    return (
      <p className="text-sm text-ink-faint">
        <T area="entity" k="noConnectionsTitle" />
      </p>
    );
  }

  const rowContext = contextId ?? selfId;
  const self = selfId ? entityRefById(selfId) : null;
  const { above, below } = splitConnectionTree(connections);
  const hasSpine = Boolean(self) || below.length > 0;

  return (
    <div className="min-w-0">
      {above.length > 0 ? (
        <ul>
          {above.map((branch) => (
            <BranchList key={branch.key} branch={branch} selfId={rowContext} showRole={false} />
          ))}
        </ul>
      ) : null}
      {hasSpine ? (
        <div className={above.length > 0 ? "ms-3 -mt-1 border-s border-line" : "min-w-0"}>
          {self ? (
            <div className={above.length > 0 ? "-ms-[13px]" : undefined}>
              <Hub name={self.name} kind={self.kind} />
            </div>
          ) : null}
          {below.length > 0 ? (
            <ul className={above.length > 0 ? "ps-3" : self ? "ms-3 border-s border-line ps-3" : undefined}>
              {below.map((branch) => (
                <BranchList key={branch.key} branch={branch} selfId={rowContext} showRole />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
