"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { parseSelection, serializeSelection, withParams, URL_PARAMS } from "@/lib/canvas-url";
import { sameSelection, selectionOwnsPath, type Selection } from "@/lib/selection";
import { useSelection } from "./selection-provider";

/**
 * What is picked, in the address bar (`?sel=`), so a pick can be shared and
 * Back steps through picks. A pick is a history entry (pushState); the page's
 * own entity is the page itself and never goes in the URL. A value that does
 * not name something real is ignored and removed.
 *
 * The other canvas parameters (view, layer, date) are written by
 * components/canvas-controls.tsx, which owns that state.
 */

function currentSel(): string | null {
  return new URLSearchParams(window.location.search).get(URL_PARAMS.sel);
}

function writeSel(value: string | null, mode: "push" | "replace") {
  const search = withParams(window.location.search, { sel: value });
  if (search === window.location.search) return;
  const url = `${window.location.pathname}${search}${window.location.hash}`;
  if (mode === "push") window.history.pushState(window.history.state, "", url);
  else window.history.replaceState(window.history.state, "", url);
}

/** Whether a parsed pick names something that exists; the data it needs loads only now. */
async function exists(selection: Selection): Promise<boolean> {
  try {
    const data = await import("@/components/panels/use-panel-data");
    const layout = async () => (await data.loadGraphLayout()) as import("@/components/panels/use-panel-data").PanelLayout;
    switch (selection.kind) {
      case "cluster":
        return (await layout()).clusterById.has(selection.id);
      case "sector":
        return (await layout()).sectors.some((sector) => sector.id === selection.id);
      case "fractie":
        return Boolean((await layout()).chambers[selection.chamberId]?.entries[selection.index]);
      default:
        return (await data.loadPanelRecord(selection.id)) !== null;
    }
  } catch {
    return false;
  }
}

export function SelectionUrlSync() {
  const { current, select, clear } = useSelection();
  const pathname = usePathname();
  /** The URL has been read: until then the writer must not remove what has not been restored yet. */
  const restored = useRef(false);
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    let active = true;
    const apply = async (value: string | null, fromPop: boolean) => {
      const parsed = parseSelection(value);
      if (parsed === null) {
        if (value !== null) writeSel(null, "replace");
        if (fromPop && currentRef.current !== null && !selectionOwnsPath(currentRef.current, window.location.pathname)) clear();
        return;
      }
      if (sameSelection(parsed, currentRef.current)) return;
      if (!(await exists(parsed))) {
        if (active) writeSel(null, "replace");
        return;
      }
      if (active) select(parsed);
    };
    void apply(currentSel(), false).finally(() => {
      if (active) restored.current = true;
    });
    const onPop = () => void apply(currentSel(), true);
    window.addEventListener("popstate", onPop);
    return () => {
      active = false;
      window.removeEventListener("popstate", onPop);
    };
    // The store's functions are stable for the page's life; restoring is once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writerPath = useRef(pathname);
  useEffect(() => {
    if (!restored.current) return;
    // Right after a move to another page the old pick is still in hand for one
    // render; the store drops it next, and writing it now would add a history step.
    if (writerPath.current !== pathname) {
      writerPath.current = pathname;
      return;
    }
    const want = selectionOwnsPath(current, pathname) ? null : serializeSelection(current);
    if (want === currentSel()) return;
    // A new pick is a step to go back to; letting go only tidies the address.
    writeSel(want, want === null ? "replace" : "push");
  }, [current, pathname]);

  return null;
}
