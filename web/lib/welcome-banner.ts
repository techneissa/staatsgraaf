/**
 * Whether the reader has dismissed the welcome banner (components/welcome-banner.tsx).
 * The choice lives in localStorage on this browser only: no cookie, no request,
 * nothing leaves the device. It is mirrored on <html> before first paint by a
 * script in the document head, so a reader who dismissed it never sees it
 * flash in before React hydrates; the rule that hides it is in globals.css
 * ("Welcome banner"). Pure module: the head script, the client and the tests
 * share it.
 */

export const WELCOME_BANNER_KEY = "staatsgraaf.welcome-banner";
export const WELCOME_BANNER_DISMISSED = "dismissed";
export const WELCOME_BANNER_ATTR = "data-welcome-dismissed";

/** Where the banner's "inspired by" link goes. */
export const CIVLAB_URL = "https://graph.civlab.org/us";

export const WELCOME_BANNER_INIT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  WELCOME_BANNER_KEY,
)})===${JSON.stringify(WELCOME_BANNER_DISMISSED)})document.documentElement.setAttribute(${JSON.stringify(
  WELCOME_BANNER_ATTR,
)},"")}catch(e){}})();`;

/** The slice of Storage these helpers use, so tests can pass a plain object. */
export type BannerStorage = Pick<Storage, "getItem" | "setItem">;

/** A stored value read as "dismissed"; anything else, or nothing, shows the banner. */
export function isDismissed(raw: string | null | undefined): boolean {
  return raw === WELCOME_BANNER_DISMISSED;
}

/** True when this browser remembers a dismissal. Storage that throws counts as not dismissed. */
export function readDismissed(storage: BannerStorage | undefined): boolean {
  if (!storage) return false;
  try {
    return isDismissed(storage.getItem(WELCOME_BANNER_KEY));
  } catch {
    return false;
  }
}

/** Remembers the dismissal. Returns false when storage refuses; the banner then stays hidden for this page view only. */
export function writeDismissed(storage: BannerStorage | undefined): boolean {
  if (!storage) return false;
  try {
    storage.setItem(WELCOME_BANNER_KEY, WELCOME_BANNER_DISMISSED);
    return true;
  } catch {
    return false;
  }
}
