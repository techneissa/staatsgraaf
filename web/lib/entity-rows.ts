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
