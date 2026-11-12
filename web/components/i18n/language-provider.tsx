"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isEnglishRoute } from "@/lib/language-routes";
import { englishTitle } from "@/lib/i18n/page-titles";
import {
  DEFAULT_LOCALE,
  LANG_STORAGE_KEY,
  isLocale,
  type Locale,
} from "@/lib/i18n/locales";

export type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

/**
 * Keeps the tab title in the chosen language. Next writes the Dutch title on
 * every navigation, so this watches the <title> and shows its English name
 * (lib/i18n/page-titles.ts) while English is picked. It remembers the Dutch
 * title to put back when the reader switches to Dutch.
 */
function useDocumentTitle(locale: Locale) {
  const dutch = useRef<string | null>(null);
  const written = useRef<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const current = document.title;
      if (current !== written.current) dutch.current = current;
      const english = locale === "en" && dutch.current !== null ? englishTitle(dutch.current) : null;
      const next = english ?? dutch.current;
      written.current = english;
      if (next !== null && next !== current) document.title = next;
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // The English news routes render in English from the first byte of their HTML.
  const onEnglishRoute = isEnglishRoute(usePathname());
  const [locale, setLocaleState] = useState<Locale>(onEnglishRoute ? "en" : DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (isLocale(stored) && stored !== DEFAULT_LOCALE) setLocaleState(stored);
    } catch {
      /* private browsing: keep default */
    }
  }, []);

  useDocumentTitle(locale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function useLocaleSetter(): (locale: Locale) => void {
  return useContext(LocaleContext).setLocale;
}
