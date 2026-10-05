"use client";

import { useCallback, useEffect, useState } from "react";
import { indexListUrl, type IndexListKey, type IndexRowOf } from "@/lib/index-lists";

const resolved = new Map<IndexListKey, unknown[]>();
const inflight = new Map<IndexListKey, Promise<unknown[]>>();

/** The rows of a list once fetched, or null: lets a page that is revisited render the whole list at once. */
export function cachedIndexRows<K extends IndexListKey>(key: K): IndexRowOf[K][] | null {
  return (resolved.get(key) as IndexRowOf[K][] | undefined) ?? null;
}

export function loadIndexRows<K extends IndexListKey>(key: K): Promise<IndexRowOf[K][]> {
  const hit = resolved.get(key);
  if (hit) return Promise.resolve(hit as IndexRowOf[K][]);
  let promise = inflight.get(key);
  if (!promise) {
    promise = fetch(indexListUrl(key)).then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<unknown[]>;
    });
    promise.then(
      (rows) => {
        resolved.set(key, rows);
        inflight.delete(key);
      },
      () => inflight.delete(key),
    );
    inflight.set(key, promise);
  }
  return promise as Promise<IndexRowOf[K][]>;
}

export type IndexRows<K extends IndexListKey> = {
  rows: IndexRowOf[K][];
  /** True once the whole list is here; until then rows is the server-rendered first screen. */
  full: boolean;
  failed: boolean;
  retry: () => void;
};

/**
 * The rows of an index list: the first screen the server rendered, replaced by
 * the whole list as soon as its JSON file arrives. The fetch starts on mount
 * (the page also preloads it), and a list that was fetched before is used at
 * once, so coming Back to the page paints the full list in one go.
 */
export function useIndexRows<K extends IndexListKey>(key: K, initial: IndexRowOf[K][]): IndexRows<K> {
  const [state, setState] = useState<{ rows: IndexRowOf[K][]; full: boolean }>(() => {
    const cached = cachedIndexRows(key);
    return cached ? { rows: cached, full: true } : { rows: initial, full: false };
  });
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    loadIndexRows(key).then(
      (rows) => {
        if (!cancelled) setState({ rows, full: true });
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { rows: state.rows, full: state.full, failed, retry };
}
