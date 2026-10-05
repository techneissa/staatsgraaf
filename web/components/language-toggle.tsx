"use client";

import { startTransition, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isEnglishRoute, languageTwin } from "@/lib/language-routes";
import { DEFAULT_LOCALE, LOCALES, LOCALE_LABEL, type Locale } from "@/lib/i18n/locales";
import { SlidingIndicator } from "./motion/sliding-indicator";
import { useLocale, useLocaleSetter } from "./i18n/language-provider";
import { useT } from "./i18n/use-t";

/**
 * NL/EN switch. From sm it is a two-segment control; on a phone, where the
 * top bar has room for one 44 px target only, it is a single button that
 * names the other language, the usual pattern for a language link.
 *
 * A page that exists in both languages at two routes (the news pages, see
 * lib/language-routes.ts) switches by moving between the routes, so the address,
 * the title and the language alternates always agree with the text. Every other
 * page keeps its route and swaps its text. Opening the English route of such a
 * page (a shared link) shows it in English.
 */
export function LanguageToggle() {
  const locale = useLocale();
  const setLocaleNow = useLocaleSetter();
  // As a transition, so the page column cross-fades into the other language
  // (the <ViewTransition> in app/layout.tsx) instead of cutting.
  const router = useRouter();
  const pathname = usePathname();
  const twin = languageTwin(pathname);
  const setLocale = (next: Locale) => {
    startTransition(() => setLocaleNow(next));
    if (twin !== null && pathname !== null) {
      const target = next === "en" ? twin.en : twin.nl;
      const here = pathname.endsWith("/") ? pathname : `${pathname}/`;
      if (target !== here) router.push(target);
    }
  };
  // The address says English: show English, whatever was stored.
  const onEnglishRoute = isEnglishRoute(pathname);
  useEffect(() => {
    if (onEnglishRoute) setLocaleNow("en");
  }, [onEnglishRoute, pathname, setLocaleNow]);
  const t = useT("graph");
  const other: Locale = locale === "nl" ? "en" : "nl";
  const switchLabel = other === "en" ? t("languageSwitchToEn") : t("languageSwitchToNl");

  return (
    <>
      <button
        type="button"
        onClick={() => setLocale(other)}
        aria-label={switchLabel}
        title={switchLabel}
        className="tap-target flex items-center justify-center rounded-sm border border-line px-2 py-1.5 text-xs font-medium text-ink-muted transition-fast hover:border-line-strong hover:text-ink sm:hidden"
      >
        {LOCALE_LABEL[other]}
      </button>
      <div
        role="group"
        aria-label={t("languageGroup")}
        className="hidden items-center rounded-sm border border-line bg-surface-inset p-0.5 text-xs font-medium sm:flex"
      >
        <SlidingIndicator className="rounded-sm bg-surface shadow-sm" />
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={locale === code}
            onClick={() => setLocale(code as Locale)}
            className={`tap-target rounded-sm px-2 py-1 transition-fast ${
              locale === code ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {LOCALE_LABEL[code]}
          </button>
        ))}
      </div>
    </>
  );
}

export { DEFAULT_LOCALE };
