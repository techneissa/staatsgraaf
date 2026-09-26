"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import type { DictArea } from "@/lib/i18n/dicts";
import { formatCountIn, formatDateIn, formatPeriodIn } from "@/lib/format";

/**
 * Dates rendered in the site language. The server renders the Dutch form at
 * build time; after hydration the stored locale takes over, so an English
 * reader sees "3 January 2024" instead of "3 januari 2024".
 */
export function LocalDate({ iso, short = false }: { iso: string; short?: boolean }) {
  const locale = useLocale();
  return <time dateTime={iso.slice(0, 10)}>{formatDateIn(iso, locale, short ? "short" : "long")}</time>;
}

/** "Sinds 3 januari 2024" or "3 januari 2024 tot 5 mei 2025", in the site language. */
export function LocalPeriod({ start, end, short = false }: { start: string | null; end: string | null; short?: boolean }) {
  const locale = useLocale();
  return <>{formatPeriodIn(start, end, locale, short ? "short" : "long")}</>;
}

/** A count with the thousands separator of the site language. */
export function LocalCount({ value }: { value: number }) {
  const locale = useLocale();
  return <>{formatCountIn(value, locale)}</>;
}

/**
 * A dictionary string whose variables include dates or counts: every entry in
 * `dates` and `counts` is formatted in the site language before interpolation.
 */
export function DateT({
  area,
  k,
  dates = {},
  counts = {},
  vars = {},
  short = false,
}: {
  area: DictArea;
  k: string;
  dates?: Record<string, string>;
  counts?: Record<string, number>;
  vars?: Record<string, string | number>;
  short?: boolean;
}) {
  const locale = useLocale();
  const t = useT(area);
  const formatted: Record<string, string | number> = { ...vars };
  for (const [name, value] of Object.entries(counts)) formatted[name] = formatCountIn(value, locale);
  for (const [name, iso] of Object.entries(dates)) formatted[name] = formatDateIn(iso, locale, short ? "short" : "long");
  return <>{t(k, formatted)}</>;
}
