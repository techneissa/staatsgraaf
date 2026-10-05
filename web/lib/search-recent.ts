export const RECENT_KEY = "staatsgraaf.search.recent";
export const RECENT_MAX = 5;

/** Newest first, no duplicates (ignoring case), capped. */
export function pushRecent(list: readonly string[], query: string, max = RECENT_MAX): string[] {
  const value = query.trim().replace(/\s+/g, " ");
  if (value.length < 2) return [...list];
  const key = value.toLowerCase();
  return [value, ...list.filter((item) => item.toLowerCase() !== key)].slice(0, max);
}

export function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

export function writeRecent(list: readonly string[]): void {
  try {
    if (list.length === 0) window.localStorage.removeItem(RECENT_KEY);
    else window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    // Storage can be blocked; recent searches are a convenience.
  }
}
