"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import {
  EMPTY_SELECTION,
  currentSelection,
  selectionReducer,
  type Selection,
} from "@/lib/selection";

export type SelectionApi = {
  /** The current pick, or null when nothing is picked. */
  current: Selection | null;
  /** The pick before the current one, for a "back to ..." label. */
  previous: Selection | null;
  canGoBack: boolean;
  /** Pick something; the current pick becomes the way back. */
  select: (selection: Selection) => void;
  /** Swap the current pick without adding a step. */
  replace: (selection: Selection) => void;
  /** Step back one pick. */
  back: () => void;
  /** Drop every pick. */
  clear: () => void;
};

const SelectionContext = createContext<SelectionApi | null>(null);

/** Holds the reader's selection for the whole page, above both the canvas and the page column. */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(selectionReducer, EMPTY_SELECTION);
  const api = useMemo<SelectionApi>(
    () => ({
      current: currentSelection(state),
      previous: state.stack.length > 1 ? state.stack[state.stack.length - 2] : null,
      canGoBack: state.stack.length > 1,
      select: (selection) => dispatch({ type: "select", selection }),
      replace: (selection) => dispatch({ type: "replace", selection }),
      back: () => dispatch({ type: "back" }),
      clear: () => dispatch({ type: "clear" }),
    }),
    [state],
  );
  return <SelectionContext.Provider value={api}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionApi {
  const api = useContext(SelectionContext);
  if (api === null) throw new Error("useSelection needs a SelectionProvider above it (app/layout.tsx).");
  return api;
}
