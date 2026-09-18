"use client";

import { useEffect, useState } from "react";
import type { GraphBundle } from "@/lib/graph";

export type GraphBundleState = {
  bundle: GraphBundle | null;
  status: "loading" | "ready" | "error";
};

export function useGraphBundle(): GraphBundleState {
  const [state, setState] = useState<GraphBundleState>({ bundle: null, status: "loading" });

  useEffect(() => {
    let active = true;
    fetch("/graph.json")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<GraphBundle>;
      })
      .then((bundle) => {
        if (active) setState({ bundle, status: "ready" });
      })
      .catch(() => {
        if (active) setState({ bundle: null, status: "error" });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
