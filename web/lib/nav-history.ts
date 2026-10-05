/**
 * In-app history, for two jobs the Next router does not do by itself:
 *
 * 1. Say whether "back" and "forward" have an entry to go to, so the top bar
 *    never offers a dead button.
 * 2. Remember where each history entry was scrolled to, so back returns to the
 *    same spot and a fresh navigation always lands at the top.
 *
 * Browser only. `installNavHistory()` stamps every entry the router pushes with
 * a key and an index (merged into the router's own state object, which keeps
 * its `__NA` marker) and listens for popstate. The module is plain TypeScript
 * with no React, so `NavScroll` and `HistoryControls` share one store.
 */

const KEY = "sgKey";
const IDX = "sgIdx";
const MAX_STORAGE = "staatsgraaf.nav.max";
const POSITIONS_STORAGE = "staatsgraaf.nav.scroll";
const POSITIONS_KEPT = 40;

export type NavKind = "initial" | "push" | "pop";
export type ScrollPosition = { y: number; col: number };
export type NavSnapshot = { canBack: boolean; canForward: boolean };

type Stamped = Record<string, unknown>;

let installed = false;
let idx = 0;
let max = 0;
let key = "";
let kind: NavKind = "initial";
let snapshot: NavSnapshot = { canBack: false, canForward: false };
const listeners = new Set<() => void>();
const positions = new Map<string, ScrollPosition>();

/** The scrolling column on lg and up; below it the window scrolls. */
export const PAGE_COLUMN = "sg-page-column";

/** The element that holds the page itself, under anything picked on the canvas (app/layout.tsx). */
export const PAGE_ID = "sg-page";

function isStamped(data: unknown): data is Stamped {
  return typeof data === "object" && data !== null && ("__NA" in data || "_N" in data);
}

function newKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

function publish() {
  const next = { canBack: idx > 0, canForward: idx < max };
  if (next.canBack === snapshot.canBack && next.canForward === snapshot.canForward) return;
  snapshot = next;
  for (const listener of listeners) listener();
}

function readStorage(name: string): string | null {
  try {
    return window.sessionStorage.getItem(name);
  } catch {
    return null;
  }
}

function writeStorage(name: string, value: string) {
  try {
    window.sessionStorage.setItem(name, value);
  } catch {
    // Private mode: the positions last for this page life only.
  }
}

function persist() {
  writeStorage(MAX_STORAGE, String(max));
  const entries = [...positions.entries()].slice(-POSITIONS_KEPT);
  writeStorage(POSITIONS_STORAGE, JSON.stringify(entries));
}

function currentPosition(): ScrollPosition {
  const column = document.getElementById(PAGE_COLUMN);
  return { y: Math.round(window.scrollY), col: Math.round(column?.scrollTop ?? 0) };
}

export function installNavHistory(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  try {
    window.history.scrollRestoration = "manual";
  } catch {
    // Older browsers keep their own restoration.
  }

  const state: unknown = window.history.state;
  const stored = typeof state === "object" && state !== null ? (state as Stamped) : null;
  if (stored !== null && typeof stored[IDX] === "number" && typeof stored[KEY] === "string") {
    idx = stored[IDX] as number;
    key = stored[KEY] as string;
    max = Math.max(idx, Number.parseInt(readStorage(MAX_STORAGE) ?? "0", 10) || 0);
  } else {
    // A fresh document. Arriving from another page of this site leaves one
    // entry to go back to; arriving from outside leaves none worth offering.
    let sameSite = false;
    try {
      sameSite = document.referrer !== "" && new URL(document.referrer).origin === window.location.origin;
    } catch {
      sameSite = false;
    }
    idx = sameSite ? 1 : 0;
    max = idx;
    key = newKey();
    if (stored === null || isStamped(stored)) {
      window.history.replaceState({ ...(stored ?? {}), [KEY]: key, [IDX]: idx }, "");
    }
  }
  try {
    const saved = JSON.parse(readStorage(POSITIONS_STORAGE) ?? "[]") as [string, ScrollPosition][];
    for (const [entry, position] of saved) positions.set(entry, position);
  } catch {
    // A damaged record is ignored.
  }
  snapshot = { canBack: idx > 0, canForward: idx < max };

  const push = window.history.pushState.bind(window.history);
  const replace = window.history.replaceState.bind(window.history);
  window.history.pushState = (data: unknown, unused: string, url?: string | URL | null) => {
    if (!isStamped(data)) return push(data, unused, url);
    idx += 1;
    max = idx;
    key = newKey();
    kind = "push";
    push({ ...data, [KEY]: key, [IDX]: idx }, unused, url);
    persist();
    publish();
  };
  window.history.replaceState = (data: unknown, unused: string, url?: string | URL | null) => {
    // A replace keeps the entry, so it keeps the key and the index.
    if (!isStamped(data)) return replace(data, unused, url);
    replace({ ...data, [KEY]: key, [IDX]: idx }, unused, url);
  };

  window.addEventListener("popstate", () => {
    const now: unknown = window.history.state;
    const entry = typeof now === "object" && now !== null ? (now as Stamped) : null;
    if (entry !== null && typeof entry[IDX] === "number" && typeof entry[KEY] === "string") {
      idx = entry[IDX] as number;
      key = entry[KEY] as string;
      max = Math.max(max, idx);
    }
    kind = "pop";
    publish();
  });

  // Every scroll of the window or the page column updates the current entry.
  window.addEventListener(
    "scroll",
    (event) => {
      const target = event.target;
      if (target !== document && !(target instanceof HTMLElement && target.id === PAGE_COLUMN)) return;
      positions.set(key, currentPosition());
    },
    { capture: true, passive: true },
  );
  window.addEventListener("pagehide", persist);
}

export function subscribeNav(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function navSnapshot(): NavSnapshot {
  return snapshot;
}

const SERVER_SNAPSHOT: NavSnapshot = { canBack: false, canForward: false };
export function navServerSnapshot(): NavSnapshot {
  return SERVER_SNAPSHOT;
}

/** How the current entry was reached: a router push, or back and forward. */
export function lastNavKind(): NavKind {
  return kind;
}

/** Where the current entry was last scrolled to, if it was. */
export function savedPosition(): ScrollPosition | null {
  return positions.get(key) ?? null;
}
