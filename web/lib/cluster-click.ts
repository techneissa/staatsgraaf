/**
 * What a click on the graph canvas does to the selection and the open
 * cluster. Pure, so the rules are tested apart from the canvas.
 *
 * Rules (owner request 25-09-2026):
 * - A click on any member of the open cluster selects that member and the
 *   cluster stays open; a click on another member switches the selection and
 *   the cluster still stays open. Clicking the selected member again clears
 *   the selection but keeps the cluster open.
 * - A click on a closed grid opens it (on one of its dots: and selects that dot).
 * - A click on a mark outside the open cluster selects it and folds the cluster
 *   (or opens the cluster that mark belongs to).
 * - A click on the background, or Escape, folds the cluster.
 * - The open grid itself never takes a click: its members do. A click that
 *   lands on it anyway (for example between two unpacked members) is ignored
 *   rather than folding the cluster under the reader's pointer.
 */
export type CanvasClick =
  | { kind: "node"; id: string; cluster: string | null }
  | { kind: "cluster"; id: string; dot: string | null }
  | { kind: "fractie" }
  | { kind: "background"; nearMember: string | null };

export type CanvasClickState = { selectedId: string | null; openCluster: string | null };

/** `select: undefined` means leave the selection as it is. */
export type CanvasClickResult = { select: string | null | undefined; open: string | null };

export function resolveCanvasClick(click: CanvasClick, state: CanvasClickState): CanvasClickResult {
  const { selectedId, openCluster } = state;
  switch (click.kind) {
    case "fractie":
      return { select: null, open: null };
    case "background":
      if (openCluster !== null && click.nearMember !== null) return { select: click.nearMember, open: openCluster };
      return { select: null, open: null };
    case "cluster":
      if (click.id === openCluster) {
        return click.dot !== null ? { select: click.dot, open: openCluster } : { select: undefined, open: openCluster };
      }
      if (click.dot !== null && click.dot !== selectedId) return { select: click.dot, open: click.id };
      return { select: null, open: click.id };
    case "node":
      if (click.id === selectedId) {
        // Toggle the selection off; an open cluster stays open around it.
        return { select: null, open: openCluster };
      }
      return { select: click.id, open: click.cluster };
  }
}
