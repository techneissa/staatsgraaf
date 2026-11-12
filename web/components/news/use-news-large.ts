"use client";

import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { NEWS_VIEW_ATTR, readNewsLarge, writeNewsLarge, type NewsViewStorage } from "@/lib/news-view-mode";

/** A layout effect on the client, a no-op while rendering on the server. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** The lg breakpoint, where the large view applies (the same one the workspace columns use). */
const DESKTOP = "(min-width: 64rem)";

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** The storage, or undefined when the browser blocks it: the getter itself throws then. */
function getStorage(): NewsViewStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * The large news view: on or off, remembered on this device. The server renders the
 * standard view; before the first paint of the client the stored choice is read. While
 * it is on, <html> carries `data-news-large`, which lets the page column take the whole
 * workspace (globals.css), and the attribute is removed when the reader leaves the page.
 * `active` is the choice and a screen wide enough for it: below lg the page stays in its
 * standard layout, whatever is stored.
 */
export function useNewsLarge(): { large: boolean; active: boolean; setLarge: (large: boolean) => void } {
  const [large, setLargeState] = useState(false);
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );

  useIsomorphicLayoutEffect(() => {
    setLargeState(readNewsLarge(getStorage()));
  }, []);

  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    if (large) root.setAttribute(NEWS_VIEW_ATTR, "");
    else root.removeAttribute(NEWS_VIEW_ATTR);
    return () => root.removeAttribute(NEWS_VIEW_ATTR);
  }, [large]);

  const setLarge = useCallback((next: boolean) => {
    setLargeState(next);
    writeNewsLarge(getStorage(), next);
  }, []);

  return { large, active: large && desktop, setLarge };
}
