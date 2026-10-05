"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { useDict } from "@/components/i18n/use-t";
import { formatShare } from "@/lib/budget-format";

/** A share of a total in the reader's locale, with the spoken form for screen readers. */
export function ShareLabel({ share, className = "" }: { share: number; className?: string }) {
  const locale = useLocale() === "en" ? "en" : "nl";
  const t = useDict("news");
  const label = formatShare(share, locale);
  return (
    <span className={`tabular-nums ${className}`}>
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{t("budgetShareAria", { percent: label })}</span>
    </span>
  );
}
