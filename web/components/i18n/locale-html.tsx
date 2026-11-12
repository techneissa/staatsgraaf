"use client";

import type { ReactNode } from "react";
import { localeHtmlLang } from "@/lib/i18n/locales";
import { useLocale } from "./language-provider";

/**
 * The <html> element, with `lang` following the language of the page. The
 * English news routes render it as English in their static HTML (the provider
 * starts in English there), and the language switch updates it for the rest.
 */
export function LocaleHtml({ children }: { children: ReactNode }) {
  return (
    <html lang={localeHtmlLang(useLocale())} suppressHydrationWarning>
      {children}
    </html>
  );
}
