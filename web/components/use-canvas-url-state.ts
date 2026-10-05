"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { amsterdamDay } from "@/lib/change-clock";
import { parseCanvasUrl, shownLayersFor, withParams } from "@/lib/canvas-url";
import type { CanvasView } from "./canvas-controls";

/**
 * The canvas frame's own state in the address bar: which canvas (`view`), the
 * layers left on (`layer`) and the "as of" date (`date`). Read once when the
 * page loads (and, for the layers, once the layers are known); written with
 * replaceState because they change continuously and are not steps to go back
 * to. The pick (`sel`) is written by components/selection/selection-url-sync.
 * Invalid values are ignored (lib/canvas-url.ts).
 */
export function useCanvasUrlState({
  view,
  onViewChange,
  layers,
  hiddenLayers,
  onToggleLayer,
  asOf,
  onAsOfChange,
}: {
  view: CanvasView;
  onViewChange: (view: CanvasView) => void;
  /** Every layer that exists, in legend order; empty until the graph has loaded. */
  layers: readonly string[];
  hiddenLayers: ReadonlySet<string>;
  onToggleLayer: (layer: string, visible: boolean) => void;
  asOf: string | null;
  onAsOfChange: (date: string | null) => void;
}) {
  const pathname = usePathname();
  const today = amsterdamDay(new Date());
  const viewRestored = useRef(false);
  const layersRestored = useRef(false);
  const dateRestored = useRef(false);
  /** A restore has queued state changes: the write in the same commit would still see the old state. */
  const skipWrite = useRef(false);
  const latest = useRef({ onViewChange, onToggleLayer, onAsOfChange });
  latest.current = { onViewChange, onToggleLayer, onAsOfChange };

  // Restore. The view and the date need no data; the layers need the list of layers.
  useEffect(() => {
    if (viewRestored.current) return;
    viewRestored.current = true;
    const parsed = parseCanvasUrl(window.location.search, layers, today);
    if (parsed.view && parsed.view !== view) {
      skipWrite.current = true;
      latest.current.onViewChange(parsed.view);
    }
    if (parsed.asOf && parsed.asOf !== asOf) {
      skipWrite.current = true;
      latest.current.onAsOfChange(parsed.asOf);
    }
    dateRestored.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (layersRestored.current || layers.length === 0) return;
    layersRestored.current = true;
    const parsed = parseCanvasUrl(window.location.search, layers, today);
    if (parsed.shownLayers) {
      for (const layer of layers) {
        if (parsed.shownLayers.includes(layer)) continue;
        skipWrite.current = true;
        latest.current.onToggleLayer(layer, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  // Write, once what is in the URL has been applied.
  useEffect(() => {
    if (!viewRestored.current || !dateRestored.current) return;
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    // Until the layers are known the URL's layer list is left alone; a reader who
    // arrives with ?layer= must not lose it while the graph loads.
    const layerReady = layers.length === 0 ? false : layersRestored.current;
    const shown = layerReady ? shownLayersFor(layers, hiddenLayers) : undefined;
    const patch: Parameters<typeof withParams>[1] = {
      view: view === "graph" ? null : view,
      date: asOf,
    };
    if (layerReady) patch.layer = shown === null || shown === undefined ? null : shown.join(",");
    const search = withParams(window.location.search, patch);
    if (search === window.location.search) return;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}${window.location.hash}`);
  }, [view, asOf, hiddenLayers, layers, pathname]);
}
