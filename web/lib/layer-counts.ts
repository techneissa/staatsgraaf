/**
 * One place that counts organisations for the graph's legend and its sector
 * panel, so the two can never disagree. Every number here is a count of
 * organisations in the dataset (hidden children of a ministry or a gemeente
 * included), and `municipalities` counts the real gemeenten on their own,
 * because the layer that carries the label "Gemeenten" also holds the raden,
 * the commissies and the samenwerkingsverbanden.
 *
 * The electorate is drawn as the frame around the map, not as a body in a
 * layer, so it is not counted in a layer.
 */

export type CountableNode = { branch: string; sector: string; subtype: string };

export type LayerCounts = {
  /** Organisations per branch (the legend's layers). */
  byBranch: Map<string, number>;
  /** Organisations per sector (the panel's sectors). */
  bySector: Map<string, number>;
  /** Organisations with subtype gemeente. */
  municipalities: number;
};

const FRAME_SECTOR = "frame";

export function countLayers(nodes: readonly CountableNode[]): LayerCounts {
  const byBranch = new Map<string, number>();
  const bySector = new Map<string, number>();
  let municipalities = 0;
  for (const node of nodes) {
    if (node.sector === FRAME_SECTOR) continue;
    byBranch.set(node.branch, (byBranch.get(node.branch) ?? 0) + 1);
    bySector.set(node.sector, (bySector.get(node.sector) ?? 0) + 1);
    if (node.subtype === "gemeente") municipalities += 1;
  }
  return { byBranch, bySector, municipalities };
}

/** The sector that carries the gemeenten, where the note about real gemeenten belongs. */
export const MUNICIPALITY_SECTOR = "gemeenten";
export const MUNICIPALITY_BRANCH = "decentraal-lokaal";
