"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_NEWS_FILTERS, parseNewsFilters, sameNewsFilters, writeNewsFilters, type NewsFilterState } from "@/lib/news-url-state";

/** A layout effect on the client, a no-op while rendering on the server. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The news filters, kept in the address (`?taal=&soort=&bron=&entity=&alles=1`, NW-8). The
 * server renders the defaults; before the first paint of the client the address is read,
 * so Back and shared links restore the filters without a visible jump. Changes are
 * written with `replaceState`, so the filters do not pile up in the history and Back
 * still leaves the page. Invalid values in the address are ignored.
 */
export function useNewsFilters(): {
  filters: NewsFilterState;
  update: (patch: Partial<NewsFilterState>) => void;
  /** True once the address has been read, so a consumer can tidy values that no longer apply. */
  ready: boolean;
} {
  const [filters, setFilters] = useState<NewsFilterState>(DEFAULT_NEWS_FILTERS);
  const [ready, setReady] = useState(false);
  const current = useRef(filters);

  useIsomorphicLayoutEffect(() => {
    const read = () => {
      const next = parseNewsFilters(window.location.search);
      if (!sameNewsFilters(next, current.current)) {
        current.current = next;
        setFilters(next);
      }
    };
    read();
    setReady(true);
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  const update = useCallback((patch: Partial<NewsFilterState>) => {
    const next = { ...current.current, ...patch };
    if (sameNewsFilters(next, current.current)) return;
    current.current = next;
    setFilters(next);
    const search = writeNewsFilters(window.location.search, next);
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}${window.location.hash}`);
    }
  }, []);

  return { filters, update, ready };
}
