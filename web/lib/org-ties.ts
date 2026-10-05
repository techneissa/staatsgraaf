/**
 * How many bodies one body is tied to, counted one way for every place that
 * says it: the details panel, the hover card and the canvas's status line.
 * A tie is a relation drawn between two bodies, the body it is part of, or a
 * body that is part of it; the same body reached two ways counts once.
 * (Persons holding its positions are not bodies; the panels count them apart.)
 */

export type TieSource = {
  adjacency: ReadonlyMap<string, readonly string[]>;
  nodes: readonly { id: string; parent: string | null }[];
  byId: ReadonlyMap<string, { parent: string | null }>;
};

export type OrgTies = {
  related: string[];
  parent: string | null;
  children: string[];
  /** Distinct bodies across all three. */
  connections: number;
};

export function orgTies(source: TieSource, id: string): OrgTies {
  const related = [...(source.adjacency.get(id) ?? [])];
  const parentId = source.byId.get(id)?.parent ?? null;
  const parent = parentId !== null && source.byId.has(parentId) ? parentId : null;
  const children = source.nodes.filter((node) => node.parent === id).map((node) => node.id);
  const all = new Set<string>(related);
  if (parent !== null) all.add(parent);
  for (const child of children) all.add(child);
  all.delete(id);
  return { related, parent, children, connections: all.size };
}
