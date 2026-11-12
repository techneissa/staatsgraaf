"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { NEWS_VIEW_ATTR, readNewsLarge, writeNewsLarge } from "@/lib/news-view-mode";

/** A layout effect on the client, a no-op while rendering on the server. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The large news view: on or off, remembered on this device. The server renders the
 * standard view; before the first paint of the client the stored choice is read. While
 * it is on, <html> carries `data-news-large`, which lets the page column take the whole
 * workspace (globals.css), and the attribute is removed when the reader leaves the page.
 */
export function useNewsLarge(): [boolean, (large: boolean) => void] {
  const [large, setLargeState] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setLargeState(readNewsLarge(window.localStorage));
  }, []);

  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    if (large) root.setAttribute(NEWS_VIEW_ATTR, "");
    else root.removeAttribute(NEWS_VIEW_ATTR);
    return () => root.removeAttribute(NEWS_VIEW_ATTR);
  }, [large]);

  const setLarge = useCallback((next: boolean) => {
    setLargeState(next);
    writeNewsLarge(window.localStorage, next);
  }, []);

  return [large, setLarge];
}
