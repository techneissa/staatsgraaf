"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { useDict } from "@/components/i18n/use-t";
import { formatShare } from "@/lib/budget-format";

/**
 * A thin bar for a share of the total: the full track is 100 percent, the fill
 * is the share, in the colour of the organisation's branch. The percentage
 * sits beside it, so the bar never carries the number alone.
 */
export function BudgetShareBar({
  share,
  color,
  className = "",
}: {
  share: number;
  color: string;
  className?: string;
}) {
  const locale = useLocale() === "en" ? "en" : "nl";
  const t = useDict("news");
  const label = formatShare(share, locale);
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span aria-hidden="true" className="block h-1 min-w-0 flex-1 overflow-hidden rounded-pill bg-surface-inset">
        <span
          className="block h-full rounded-pill"
          style={{ width: `${Math.max(0.6, Math.min(100, share))}%`, backgroundColor: color }}
        />
      </span>
      <span className="shrink-0 text-[11px] tabular-nums text-ink-faint">
        <span aria-hidden="true">{label}</span>
        <span className="sr-only">{t("budgetShareAria", { percent: label })}</span>
      </span>
    </div>
  );
}
