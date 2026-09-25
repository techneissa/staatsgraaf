"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { formatBudgetAmount } from "@/lib/budget-format";

/**
 * A budget amount in short form, in the reader's locale (€ 45,3 mld, or
 * €45.3B in English), at most four significant figures. The exact figure
 * stays in the linked source. Renders nothing when the value is missing, so
 * the caller decides how to say "not reported".
 */
export function Amount({
  value,
  unit,
  className,
}: {
  value: number | null | undefined;
  unit: string | null | undefined;
  className?: string;
}) {
  const locale = useLocale() === "en" ? "en" : "nl";
  const short = formatBudgetAmount(value, unit, locale);
  if (short === null) return null;
  return (
    <span className={`whitespace-nowrap ${className ?? ""}`}>{short}</span>
  );
}
