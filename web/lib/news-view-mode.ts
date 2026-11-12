/**
 * Whether the reader picked the large news view (components/news/news-explorer.tsx).
 * The choice lives in localStorage on this browser only, like the welcome banner's:
 * no cookie, nothing sent anywhere. Without a stored choice the standard view shows.
 */

export const NEWS_VIEW_KEY = "staatsgraaf.news-view";
export const NEWS_VIEW_LARGE = "large";

/** The attribute on <html> while the large view is on; globals.css ("Large news view") reads it. */
export const NEWS_VIEW_ATTR = "data-news-large";

/** The slice of Storage these helpers use, so tests can pass a plain object. */
export type NewsViewStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** True when this browser remembers the large view. Storage that throws counts as the standard view. */
export function readNewsLarge(storage: NewsViewStorage | undefined): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(NEWS_VIEW_KEY) === NEWS_VIEW_LARGE;
  } catch {
    return false;
  }
}

/** Remembers the choice; the standard view is the absence of the key. Storage that refuses keeps it for this page view only. */
export function writeNewsLarge(storage: NewsViewStorage | undefined, large: boolean): void {
  if (!storage) return;
  try {
    if (large) storage.setItem(NEWS_VIEW_KEY, NEWS_VIEW_LARGE);
    else storage.removeItem(NEWS_VIEW_KEY);
  } catch {
    // Private mode or storage full: the choice lasts for this page view only.
  }
}
