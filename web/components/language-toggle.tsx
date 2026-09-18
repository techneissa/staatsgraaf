"use client";

import { DEFAULT_LOCALE, LOCALES, LOCALE_LABEL, type Locale } from "@/lib/i18n/locales";
import { useLocale, useLocaleSetter } from "./i18n/language-provider";

export function LanguageToggle() {
  const locale = useLocale();
  const setLocale = useLocaleSetter();

  return (
    <div
      role="group"
      aria-label="Taal / Language"
      className="flex items-center rounded-sm border border-line bg-surface-inset p-0.5 text-xs font-medium"
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() => setLocale(code as Locale)}
          className={`rounded-sm px-2 py-1 transition-fast ${
            locale === code ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
          }`}
        >
          {LOCALE_LABEL[code]}
        </button>
      ))}
    </div>
  );
}

export { DEFAULT_LOCALE };
