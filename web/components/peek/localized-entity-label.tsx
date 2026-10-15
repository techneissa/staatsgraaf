"use client";

import { useLocale } from "@/components/i18n/language-provider";

/**
 * Dutch name by default; in English, the established gloss when one exists
 * (ADR 0012). The Dutch name stays on the title so it is one hover away.
 */
export function LocalizedEntityLabel({ dutch, english }: { dutch: string; english: string | null }) {
  const locale = useLocale();
  if (locale === "en" && english) return <span lang="en">{english}</span>;
  return <span lang="nl">{dutch}</span>;
}
