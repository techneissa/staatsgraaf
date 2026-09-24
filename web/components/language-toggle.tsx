"use client";

import { startTransition } from "react";
import { DEFAULT_LOCALE, LOCALES, LOCALE_LABEL, type Locale } from "@/lib/i18n/locales";
import { SlidingIndicator } from "./motion/sliding-indicator";
import { useLocale, useLocaleSetter } from "./i18n/language-provider";
import { useT } from "./i18n/use-t";

/**
 * NL/EN switch. From sm it is a two-segment control; on a phone, where the
 * top bar has room for one 44 px target only, it is a single button that
 * names the other language, the usual pattern for a language link.
 */
export function LanguageToggle() {
  const locale = useLocale();
  const setLocaleNow = useLocaleSetter();
  // As a transition, so the page column cross-fades into the other language
  // (the <ViewTransition> in app/layout.tsx) instead of cutting.
  const setLocale = (next: Locale) => startTransition(() => setLocaleNow(next));
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
