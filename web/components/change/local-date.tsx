"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";

type DateStyle = "long" | "short" | "dayMonth" | "weekday";

const OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  long: { day: "numeric", month: "long", year: "numeric" },
  short: { day: "numeric", month: "short", year: "numeric" },
  dayMonth: { day: "numeric", month: "long" },
  weekday: { weekday: "long" },
};

const DAY_MS = 86_400_000;

function utc(iso: string): number {
  return Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
}

/** Formats an ISO date (YYYY-MM-DD) in the site locale: nl-NL or en-GB. */
export function formatIsoDate(iso: string, locale: string, style: DateStyle = "long"): string {
  const time = utc(iso);
  if (Number.isNaN(time)) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { ...OPTIONS[style], timeZone: "UTC" }).format(
    new Date(time),
  );
}

/** A date in the site locale, rendered Dutch at build time and swapped after hydration. */
export function LocalDate({ iso, style = "long" }: { iso: string; style?: DateStyle }) {
  const locale = useLocale();
  return <time dateTime={iso.slice(0, 10)}>{formatIsoDate(iso, locale, style)}</time>;
}

/** "Vandaag", "Gisteren", a weekday in the last week, then "19 september" (with the year when it differs). */
export function DayLabel({ date, reference }: { date: string; reference: string }) {
  const locale = useLocale();
  const t = useT("home");
  const offset = Math.round((utc(reference) - utc(date)) / DAY_MS);
  let text: string;
  if (offset === 0) text = t("dayToday");
  else if (offset === 1) text = t("dayYesterday");
  else if (offset > 1 && offset < 7) {
    const weekday = formatIsoDate(date, locale, "weekday");
    text = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  } else if (date.slice(0, 4) === reference.slice(0, 4)) text = formatIsoDate(date, locale, "dayMonth");
  else text = formatIsoDate(date, locale, "long");
  return <time dateTime={date.slice(0, 10)}>{text}</time>;
}

/** "Sinds 1 juli 2026" or "1 jan 2020 tot 2 feb 2022", in the site locale. */
export function PeriodT({
  start,
  end,
  style = "long",
}: {
  start: string;
  end: string | null;
  style?: DateStyle;
}) {
  const locale = useLocale();
  const t = useT("home");
  const from = formatIsoDate(start, locale, style);
  if (end === null) return <>{t("periodSince", { start: from })}</>;
  return <>{t("periodRange", { start: from, end: formatIsoDate(end, locale, style) })}</>;
}
