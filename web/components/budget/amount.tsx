"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { formatBudgetAmount, formatBudgetAmountExact } from "@/lib/budget-format";

/**
 * A budget amount in short form (€ 45,3 mld, or €45.3B in English) with the
 * exact figure as a tooltip and for screen readers. Renders nothing when the
 * value is missing, so the caller decides how to say "not reported".
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
  const locale = useLocale();
  const short = formatBudgetAmount(value, unit, locale === "en" ? "en" : "nl");
  const exact = formatBudgetAmountExact(value, unit);
  if (short === null) return null;
  return (
    <span className={className} title={exact ?? undefined}>
      <span aria-hidden="true">{short}</span>
      <span className="sr-only">{exact}</span>
    </span>
  );
}
