/**
 * In-app history, for two jobs the Next router does not do by itself:
 *
 * 1. Say whether "back" and "forward" have an entry to go to, so the top bar
 * never offers a dead button.
 * 2. Remember where each history entry was scrolled to, so back returns to the
 * same spot and a fresh navigation always lands at the top.
 *
 * It also marks how the page changed (`data-nav` on <html>), so the page
 * transition can run the right way: a step back slides in from the left, a
 * back swipe the browser already animated gets no second animation.
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
/**
 * How the page changed, as `data-nav` on <html> for the page transition in
 * globals.css and the page arrival in components/swipe-back.tsx: "push" for a
 * link to another page, "back" and "forward" through history, "swipe" for our
 * own swipe (the old page has already slid away), "native" for a step the
 * browser animated itself (the iOS edge swipe, the trackpad swipe in Safari).
 * A change of the query string only (a filter) sets nothing.
 */
export type NavMotion = "push" | "back" | "forward" | "swipe" | "native";
export type ScrollPosition = { y: number; col: number };
export type NavSnapshot = { canBack: boolean; canForward: boolean };

type Stamped = Record<string, unknown>;

let installed = false;
let idx = 0;
let max = 0;
let key = "";
let path = "";
let kind: NavKind = "initial";
let snapshot: NavSnapshot = { canBack: false, canForward: false };
let intent: NavMotion | null = null;
let edgeTouchAt = -Infinity;
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

/** Long enough for the page transition to finish; a language switch after it cross-fades as usual. */
const MOTION_HOLD_MS = 900;
let motionTimer: ReturnType<typeof setTimeout> | undefined;

function markMotion(motion: NavMotion | null) {
  clearTimeout(motionTimer);
  const root = document.documentElement;
  if (motion === null) {
    delete root.dataset.nav;
    return;
  }
  root.dataset.nav = motion;
  motionTimer = setTimeout(() => delete root.dataset.nav, MOTION_HOLD_MS);
}

/** A touch this close to the left edge in this window before a popstate was the browser's own back swipe. */
const EDGE_PX = 24;
const EDGE_SWIPE_MS = 3000;

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

  path = window.location.pathname;
  const pathOf = (url: string | URL | null | undefined) => (url == null ? path : new URL(url, window.location.href).pathname);

  const push = window.history.pushState.bind(window.history);
  const replace = window.history.replaceState.bind(window.history);
  window.history.pushState = (data: unknown, unused: string, url?: string | URL | null) => {
    if (!isStamped(data)) return push(data, unused, url);
    idx += 1;
    max = idx;
    key = newKey();
    kind = "push";
    const to = pathOf(url);
    markMotion(to !== path ? (intent ?? "push") : null);
    intent = null;
    path = to;
    push({ ...data, [KEY]: key, [IDX]: idx }, unused, url);
    persist();
    publish();
  };
  window.history.replaceState = (data: unknown, unused: string, url?: string | URL | null) => {
    // A replace keeps the entry, so it keeps the index; one to another page
    // (back one level up, components/use-go-back.ts) starts a new scroll record.
    if (!isStamped(data)) return replace(data, unused, url);
    const to = pathOf(url);
    if (to !== path) {
      key = newKey();
      markMotion(intent ?? "push");
      intent = null;
      path = to;
    }
    replace({ ...data, [KEY]: key, [IDX]: idx }, unused, url);
  };

  window.addEventListener("popstate", (event) => {
    const now: unknown = window.history.state;
    const entry = typeof now === "object" && now !== null ? (now as Stamped) : null;
    const from = idx;
    if (entry !== null && typeof entry[IDX] === "number" && typeof entry[KEY] === "string") {
      idx = entry[IDX] as number;
      key = entry[KEY] as string;
      max = Math.max(max, idx);
    }
    kind = "pop";
    // Safari before 18 and Firefox do not say whether they animated the step;
    // a touch that began at the left edge just before is their swipe.
    const animated = (event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition;
    const native = animated ?? performance.now() - edgeTouchAt < EDGE_SWIPE_MS;
    edgeTouchAt = -Infinity;
    const moved = window.location.pathname !== path;
    path = window.location.pathname;
    markMotion(native ? "native" : moved ? (intent ?? (idx < from ? "back" : "forward")) : null);
    intent = null;
    publish();
  });

  window.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];
      edgeTouchAt = event.touches.length === 1 && touch !== undefined && touch.clientX <= EDGE_PX ? performance.now() : -Infinity;
    },
    { capture: true, passive: true },
  );

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

/** The motion the next history step should get; the next push or popstate uses it up. */
export function setNavMotion(motion: NavMotion): void {
  intent = motion;
}

/** How the current entry was reached: a router push, or back and forward. */
export function lastNavKind(): NavKind {
  return kind;
}

/** Where the current entry was last scrolled to, if it was. */
export function savedPosition(): ScrollPosition | null {
  return positions.get(key) ?? null;
}
