/**
 * Small per-history-entry memory for the news lists, kept in `history.state` so Back
 * returns to the same list: which groups the reader opened and how many cards of a day
 * were shown (NW-8). Browser only. The state object is merged, never replaced, so the
 * router's own marker and the navigation history keys survive.
 */
const KEY = "sgNews";

type EntryState = Record<string, unknown>;

export function readEntryState(): EntryState {
  if (typeof window === "undefined") return {};
  const state: unknown = window.history.state;
  if (typeof state !== "object" || state === null) return {};
  const stored = (state as Record<string, unknown>)[KEY];
  return typeof stored === "object" && stored !== null ? (stored as EntryState) : {};
}

export function writeEntryState(patch: EntryState): void {
  if (typeof window === "undefined") return;
  const state: unknown = window.history.state;
  const current = typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
  try {
    window.history.replaceState({ ...current, [KEY]: { ...readEntryState(), ...patch } }, "", window.location.href);
  } catch {
    // A browser that refuses the update just forgets the extra state.
  }
}
