"use client";

import { useEffect, useRef, useState } from "react";
import type { GraphBundle, PowerMapBundle } from "@/lib/graph";

export type BundleState<T> = {
  bundle: T | null;
  status: "idle" | "loading" | "ready" | "error";
};

/**
 * One download per bundle for the whole page: the canvas, the side panels
 * and a remounted view all share the same promise, so /graph.json (about a
 * megabyte before compression) is fetched once, not once per reader. A failed
 * load is forgotten so the next reader can try again.
 */
const pending = new Map<string, Promise<unknown>>();

export function loadJsonOnce<T>(path: string): Promise<T> {
  let promise = pending.get(path) as Promise<T> | undefined;
  if (!promise) {
    promise = fetch(path).then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<T>;
    });
    pending.set(path, promise);
    promise.catch(() => pending.delete(path));
  }
  return promise;
}

/**
 * Fetch one static bundle once. `enabled` lets a view that does not need a
 * file leave it alone: the graph canvas never pays for the machtskaart, and
 * the machtskaart never pays for the graph.
 */
function useJsonBundle<T>(path: string, enabled: boolean): BundleState<T> {
  const [state, setState] = useState<BundleState<T>>({ bundle: null, status: "idle" });
  const loadedRef = useRef(false);

  useEffect(() => {
    // A loaded bundle stays loaded when `enabled` flips. The guard is a ref,
    // not the state: React remounts effects in development, and a guard on
    // "already loading" would skip the second run while the first run's
    // cleanup had already cancelled its delivery.
    if (!enabled || loadedRef.current) return;
    let active = true;
    setState((current) => (current.status === "ready" ? current : { bundle: null, status: "loading" }));
    loadJsonOnce<T>(path)
      .then((bundle) => {
        if (!active) return;
        loadedRef.current = true;
        setState({ bundle, status: "ready" });
      })
      .catch(() => {
        if (active) setState({ bundle: null, status: "error" });
      });
    return () => {
      active = false;
    };
  }, [path, enabled]);

  return state;
}

export function useGraphBundle(): BundleState<GraphBundle> {
  return useJsonBundle<GraphBundle>("/graph.json", true);
}

export function usePowerMapBundle(enabled: boolean): BundleState<PowerMapBundle> {
  return useJsonBundle<PowerMapBundle>("/power-map.json", enabled);
}
