"use client";

import { useEffect, useState } from "react";
import type { HierarchyBundle } from "@/lib/hierarchy";

type State = { bundle: HierarchyBundle | null; status: "idle" | "loading" | "ready" | "error" };

/** One fetch per page view, shared by every mount of the view. */
let cache: Promise<HierarchyBundle> | null = null;

/**
 * `hierarchy.json` (lib/hierarchy.ts), fetched the first time the hierarchy
 * form is shown and kept for the rest of the page view.
 */
export function useHierarchyBundle(enabled: boolean): State {
  const [state, setState] = useState<State>({ bundle: null, status: "idle" });
  useEffect(() => {
    if (!enabled || state.status === "ready") return;
    let active = true;
    if (!cache) {
      cache = fetch("/hierarchy.json").then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<HierarchyBundle>;
      });
      cache.catch(() => {
        cache = null;
      });
    }
    setState((current) => (current.status === "ready" ? current : { bundle: null, status: "loading" }));
    cache
      .then((bundle) => {
        if (active) setState({ bundle, status: "ready" });
      })
      .catch(() => {
        if (active) setState({ bundle: null, status: "error" });
      });
    return () => {
      active = false;
    };
  }, [enabled, state.status]);
  return state;
}
