"use client";

import dynamic from "next/dynamic";
import { useSelection } from "./selection-provider";

/**
 * The profile of the current pick above the page. Nothing is picked on most
 * page loads, so its code and the data it reads (the graph layout, the panel
 * shards) load when a pick first exists, not with every page. From lg a page
 * that opens its own entity picks it at once, so the code is requested with
 * the details column instead of when the pick arrives (a late arrival would
 * push the page down).
 */
const loadProfile = () => import("@/components/panels/selection-profile").then((module) => module.SelectionProfile);
const SelectionProfile = dynamic(loadProfile, { ssr: false });
if (typeof window !== "undefined" && window.matchMedia("(min-width: 64rem)").matches) void loadProfile();

export function SelectionProfileGate() {
  const { current } = useSelection();
  return current === null ? null : <SelectionProfile />;
}
