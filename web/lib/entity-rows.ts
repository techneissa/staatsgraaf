import type { Connection, ConnectionDirection, ConnectionType, EntityRef } from "./entity";

/** One position a person holds (or held) at the page's entity, behind a connection row. */
export type ConnectionVia = { positionId: string; current: boolean };

/** One row of a connection group: an entity, every connection to it and the positions that explain them. */
export type ConnectionRowModel = {
  key: string;
  other: EntityRef;
  direction: ConnectionDirection;
  connections: Connection[];
  via: ConnectionVia[];
};

/**
 * Merge connections that point at the same entity in the same direction into
 * one row, so a person who holds three positions at a body appears once with
 * all three. `viaOf` names the position behind a connection (a tenure) or
 * null when the connection is not a tenure. Order follows the first
 * occurrence; current positions come before past ones.
 */
export function mergeConnectionRows(
  connections: Connection[],
  viaOf: (connection: Connection) => ConnectionVia | null = () => null,
): ConnectionRowModel[] {
  const rows = new Map<string, ConnectionRowModel>();
  for (const connection of connections) {
    const key = `${connection.direction}:${connection.other.id}`;
    let row = rows.get(key);
    if (row === undefined) {
      row = { key, other: connection.other, direction: connection.direction, connections: [], via: [] };
      rows.set(key, row);
    }
    row.connections.push(connection);
    const via = viaOf(connection);
    if (via !== null) {
      const known = row.via.find((entry) => entry.positionId === via.positionId);
      if (known === undefined) row.via.push(via);
      else if (via.current) known.current = true;
    }
  }
  for (const row of rows.values()) {
    row.via.sort((a, b) => Number(b.current) - Number(a.current));
  }
  return [...rows.values()];
}

/**
 * Connections a page does not repeat in a tab because a section of its own
 * lists them with more detail: the tenures and memberships derived from the
 * records (`derived:` ids), not the sourced relations.
 */
export function withoutDerived(connections: Connection[], types: ConnectionType[]): Connection[] {
  return connections.filter((connection) => !(connection.id.startsWith("derived:") && types.includes(connection.type)));
}

/** One type and direction in the who-is-connected tree, rows already merged. */
export type ConnectionBranch = {
  key: string;
  type: ConnectionType;
  direction: ConnectionDirection;
  rows: ConnectionRowModel[];
};

/**
 * Relations that place this entity under something else: a parent body, an
 * overseer, the electorate, or (for a position) the organisation it belongs to.
 */
const ABOVE_KEYS: ReadonlyArray<`${ConnectionType}:${ConnectionDirection}`> = [
  "elects:incoming",
  "appoints:incoming",
  "confirms:incoming",
  "oversees:incoming",
  "part_of:outgoing",
  "accountable_to:outgoing",
  "dept_head:outgoing",
  "office:outgoing",
];

/** What hangs off this entity, head and offices first, then parts, then the rest. */
const BELOW_KEYS: ReadonlyArray<`${ConnectionType}:${ConnectionDirection}`> = [
  "dept_head:incoming",
  "office:incoming",
  "part_of:incoming",
  "consists_of:outgoing",
  "holds_position:incoming",
  "holds_position:outgoing",
  "member_of:incoming",
  "member_of:outgoing",
  "oversees:outgoing",
  "advises:outgoing",
  "advises:incoming",
  "appoints:outgoing",
  "elects:outgoing",
  "confirms:outgoing",
  "ex_officio:incoming",
  "ex_officio:outgoing",
  "administers:incoming",
  "administers:outgoing",
  "subsidises:incoming",
  "subsidises:outgoing",
  "accountable_to:incoming",
  "succeeded_by:incoming",
  "succeeded_by:outgoing",
  "joint_arrangement_member:incoming",
  "joint_arrangement_member:outgoing",
];

function branchKey(connection: Connection): `${ConnectionType}:${ConnectionDirection}` {
  return `${connection.type}:${connection.direction}`;
}

function isAbove(connection: Connection): boolean {
  return (ABOVE_KEYS as readonly string[]).includes(branchKey(connection));
}

function branchesOf(
  connections: Connection[],
  order: ReadonlyArray<`${ConnectionType}:${ConnectionDirection}`>,
): ConnectionBranch[] {
  const grouped = new Map<string, Connection[]>();
  for (const connection of connections) {
    const key = branchKey(connection);
    const list = grouped.get(key);
    if (list) list.push(connection);
    else grouped.set(key, [connection]);
  }
  const rank = new Map(order.map((key, index) => [key, index]));
  return [...grouped.entries()]
    .sort((a, b) => {
      const aRank = rank.get(a[0] as `${ConnectionType}:${ConnectionDirection}`) ?? 1000;
      const bRank = rank.get(b[0] as `${ConnectionType}:${ConnectionDirection}`) ?? 1000;
      if (aRank !== bRank) return aRank - bRank;
      return a[0].localeCompare(b[0], "nl");
    })
    .map(([key, list]) => {
      const [type, direction] = key.split(":") as [ConnectionType, ConnectionDirection];
      const sorted = [...list].sort((a, b) => a.other.name.localeCompare(b.other.name, "nl"));
      return { key, type, direction, rows: mergeConnectionRows(sorted) };
    });
}

/**
 * Split connections into a parent chain (above) and what hangs off this
 * entity (below), so the who-is-connected tab can draw a small tree.
 */
export function splitConnectionTree(connections: Connection[]): {
  above: ConnectionBranch[];
  below: ConnectionBranch[];
} {
  const above: Connection[] = [];
  const below: Connection[] = [];
  for (const connection of connections) {
    if (isAbove(connection)) above.push(connection);
    else below.push(connection);
  }
  return { above: branchesOf(above, ABOVE_KEYS), below: branchesOf(below, BELOW_KEYS) };
}
