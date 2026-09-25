"use client";

import { useEffect, useState } from "react";
import { hydrateLayout, type GraphBundle, type GraphLayout } from "@/lib/graph";
import {
  PANEL_INDEX_URL,
  normalizePanelRecord,
  panelShardUrl,
  type PanelIndex,
  type PanelRecord,
} from "./panel-data";

/**
 * Client loaders for the two selection panels. Each file is fetched once per
 * page life, same-origin, and only when a panel first needs it: a shard of the
 * panel index when something is picked, the graph bundle for the structure
 * (the canvas has usually fetched it already, so the browser cache answers).
 */

type Loaded<T> = { value: T | null; status: "loading" | "ready" | "error" };

const shardCache = new Map<string, Promise<Record<string, Record<string, unknown>>>>();

function loadShard(url: string) {
  let promise = shardCache.get(url);
  if (!promise) {
    promise = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<{ records: Record<string, Record<string, unknown>> }>;
      })
      .then((shard) => shard.records ?? {});
    promise.catch(() => shardCache.delete(url));
    shardCache.set(url, promise);
  }
  return promise;
}

export async function loadPanelRecord(id: string): Promise<PanelRecord | null> {
  const records = await loadShard(panelShardUrl(id));
  const raw = records[id];
  return raw ? normalizePanelRecord(raw) : null;
}

function useLoaded<T>(key: string | null, load: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<Loaded<T> & { key: string | null }>({ key: null, value: null, status: "loading" });
  useEffect(() => {
    if (key === null) return;
    let active = true;
    load().then(
      (value) => active && setState({ key, value, status: "ready" }),
      () => active && setState({ key, value: null, status: "error" }),
    );
    return () => {
      active = false;
    };
    // `load` is derived from `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (key === null) return { value: null, status: "ready" };
  // A stale answer for the previous key never shows under the new one.
  return state.key === key ? state : { value: null, status: "loading" };
}

export function usePanelRecord(id: string | null): Loaded<PanelRecord> {
  return useLoaded<PanelRecord | null>(id, () => loadPanelRecord(id as string)) as Loaded<PanelRecord>;
}

let indexPromise: Promise<PanelIndex> | null = null;

export function usePanelIndex(enabled = true): Loaded<PanelIndex> {
  return useLoaded(enabled ? PANEL_INDEX_URL : null, () => {
    indexPromise ??= fetch(PANEL_INDEX_URL).then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<PanelIndex>;
    });
    indexPromise.catch(() => {
      indexPromise = null;
    });
    return indexPromise;
  });
}

let layoutPromise: Promise<GraphLayout> | null = null;

export function loadGraphLayout(): Promise<GraphLayout> {
  layoutPromise ??= fetch("/graph.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<GraphBundle>;
    })
    .then((bundle) => Object.assign(hydrateLayout(bundle), { chambers: bundle.chambers ?? {}, seatPeople: bundle.seatPeople ?? {} }));
  layoutPromise.catch(() => {
    layoutPromise = null;
  });
  return layoutPromise;
}

export type PanelLayout = GraphLayout & { chambers: GraphBundle["chambers"]; seatPeople: GraphBundle["seatPeople"] };

/** The hydrated graph layout plus the chamber seat blocks and the people on them. */
export function useGraphLayout(): Loaded<PanelLayout> {
  return useLoaded("graph", () => loadGraphLayout() as Promise<PanelLayout>);
}
