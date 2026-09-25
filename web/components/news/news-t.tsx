"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { NEWS_MESSAGES, licenseLabel, type NewsMessages } from "@/lib/news-i18n";
import type { NewsLanguage, PublisherKind } from "@/lib/types";

type StringKey = { [K in keyof NewsMessages]: NewsMessages[K] extends string ? K : never }[keyof NewsMessages];

/**
 * A news-section string in the site language, for the Dutch /nieuws/ pages:
 * they render Dutch at build time and swap to English after hydration, like
 * the rest of the site. The English /news/ pages pass their strings directly.
 */
export function NT({ k }: { k: StringKey }) {
  const locale = useLocale();
  return <>{NEWS_MESSAGES[locale][k]}</>;
}

/** Plural outlet-kind label or language name in the site language. */
export function NTKind({ kind, plural = true }: { kind: PublisherKind; plural?: boolean }) {
  const locale = useLocale();
  const messages = NEWS_MESSAGES[locale];
  return <>{plural ? messages.kindLabels[kind] : messages.kindBadges[kind]}</>;
}

export function NTLanguage({ language }: { language: NewsLanguage }) {
  const locale = useLocale();
  return <>{NEWS_MESSAGES[locale].languageLabels[language]}</>;
}

/** A feed licence value in the site language (lib/news-i18n.ts). */
export function NTLicense({ value }: { value: string }) {
  const locale = useLocale();
  return <>{licenseLabel(value, locale)}</>;
}
