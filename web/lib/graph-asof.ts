/**
 * What the "as of" date of the graph changes. The date is applied to the
 * relations that carry dates (`validFrom`, `validTo`); organisations and
 * positions are drawn as they are today. This module counts the difference so
 * the control can say so, instead of leaving the reader to wonder why nothing
 * moved.
 */
import { edgeAlive } from "./graph";

export type AsOfSummary = {
  /** Relations in the bundle. */
  total: number;
  /** Relations that carry a start or an end date. */
  dated: number;
  /** Relations not drawn on the chosen date. */
  hidden: number;
};

export function summariseAsOf(
  edges: readonly { validFrom?: string | null; validTo?: string | null }[],
  asOf: string | null,
): AsOfSummary {
  let dated = 0;
  let hidden = 0;
  for (const edge of edges) {
    if (edge.validFrom || edge.validTo) dated += 1;
    if (!edgeAlive(edge, asOf)) hidden += 1;
  }
  return { total: edges.length, dated, hidden };
}
