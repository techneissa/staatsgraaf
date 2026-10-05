/**
 * What the reader has picked on the graph or the power map, with the way back.
 *
 * This is the seam between the canvases that make a selection (the graph, the
 * power map, the seats of the Kamers) and the panels that describe it (the
 * details panel beside the canvas, the selection panel in the page column).
 * Neither side knows about the other; both only know this module.
 *
 * Pure on purpose: the reducer below is the whole behaviour, and the React
 * provider in components/selection is a thin adapter around it.
 */

/** Which canvas made the selection. Panels may word things differently per surface. */
export type SelectionSurface = "graph" | "power";

export type Selection =
  /** An organisation: a mark on the graph or a body on the power map. */
  | { kind: "org"; id: string; surface: SelectionSurface }
  /**
   * A person: a profile on the power map, or a seat of a Kamer on the graph.
   * `seat` is set when the person was picked by their seat.
   */
  | { kind: "person"; id: string; surface: SelectionSurface; seat?: { chamberId: string; fractieIndex: number } }
  /** A block of dots on the graph that stands for several bodies. */
  | { kind: "cluster"; id: string; surface: "graph" }
  /** A party group in one of the Kamers. */
  | { kind: "fractie"; chamberId: string; index: number; surface: "graph" }
  /** A whole sector of the graph. */
  | { kind: "sector"; id: string; surface: "graph" }
  /** A news item on the power map. */
  | { kind: "news"; id: string; surface: "power" }
  /** A topic on the power map. */
  | { kind: "topic"; id: string; surface: "power" };

export type SelectionState = {
  /** Oldest first; the last entry is the current selection. */
  stack: Selection[];
};

export type SelectionAction =
  /** Pick something new; the previous pick becomes the way back. */
  | { type: "select"; selection: Selection }
  /** Swap the current pick without adding a step, for example a hover preview made permanent. */
  | { type: "replace"; selection: Selection }
  /** Step back to the previous pick, or to nothing. */
  | { type: "back" }
  /** Drop every pick. */
  | { type: "clear" }
  /** The reader moved to another page: only what is that page's own entity stays picked. */
  | { type: "navigate"; pathname: string };

/** The way back keeps this many steps; older steps fall off. */
export const SELECTION_HISTORY_LIMIT = 30;

/**
 * Whether a selection is the page's own entity (the organisation page picks its
 * body, a person page its person). That pick is the page itself: it never goes
 * in the URL and it does not survive a move to another page.
 */
export function selectionOwnsPath(selection: Selection | null, pathname: string | null): boolean {
  if (selection === null || !pathname) return false;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return false;
  if (selection.kind === "org") return parts[0] === "organisaties" && selection.id === `org:${parts[1]}`;
  if (selection.kind === "person") return parts[0] === "personen" && selection.id === `person:${parts[1]}`;
  return false;
}

export const EMPTY_SELECTION: SelectionState = { stack: [] };

/** Two picks are the same thing when their kind and identity match; the surface does not count. */
export function sameSelection(a: Selection | null, b: Selection | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === "fractie" && b.kind === "fractie") return a.chamberId === b.chamberId && a.index === b.index;
  return "id" in a && "id" in b && a.id === b.id;
}

export function currentSelection(state: SelectionState): Selection | null {
  return state.stack.length > 0 ? state.stack[state.stack.length - 1] : null;
}

export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "select": {
      const current = currentSelection(state);
      // Picking the current thing again is a no-op, not a new step.
      if (sameSelection(current, action.selection)) return state;
      // Picking the thing one step back is going back, so back and forth never piles up.
      const previous = state.stack.length > 1 ? state.stack[state.stack.length - 2] : null;
      if (sameSelection(previous, action.selection)) return { stack: state.stack.slice(0, -1) };
      const stack = [...state.stack, action.selection];
      return { stack: stack.length > SELECTION_HISTORY_LIMIT ? stack.slice(-SELECTION_HISTORY_LIMIT) : stack };
    }
    case "replace": {
      if (state.stack.length === 0) return { stack: [action.selection] };
      return { stack: [...state.stack.slice(0, -1), action.selection] };
    }
    case "back":
      return state.stack.length === 0 ? state : { stack: state.stack.slice(0, -1) };
    case "clear":
      return state.stack.length === 0 ? state : EMPTY_SELECTION;
    case "navigate": {
      const kept = state.stack.filter((entry) => selectionOwnsPath(entry, action.pathname));
      return kept.length === state.stack.length ? state : kept.length === 0 ? EMPTY_SELECTION : { stack: kept };
    }
  }
}
