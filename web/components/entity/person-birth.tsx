"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { formatDateIn } from "@/lib/format";

/** Whole years between an ISO birth date and today's date (UTC calendar days). */
export function ageOn(birthIso: string, today: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthIso.slice(0, 10));
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  let age = today.getUTCFullYear() - year;
  const beforeBirthday =
    today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/**
 * "26 augustus 1954 (72 jaar)" or "26 August 1954 (aged 72)". The age is
 * computed on the reader's day, so a static page never shows a stale age
 * after hydration. `compact` uses the short date so a side rail stays narrow.
 */
export function PersonBirth({ iso, compact = false }: { iso: string; compact?: boolean }) {
  const locale = useLocale();
  const age = ageOn(iso, new Date());
  return (
    <span>
      <time dateTime={iso.slice(0, 10)}>{formatDateIn(iso, locale, compact ? "short" : "long")}</time>
      {age !== null ? (
        <span className="text-ink-faint" suppressHydrationWarning>
          {" "}
          ({compact ? age : locale === "en" ? `aged ${age}` : `${age} jaar`})
        </span>
      ) : null}
    </span>
  );
}
