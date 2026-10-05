"use client";

import { useState, type ReactNode } from "react";
import { useDict } from "@/components/i18n/use-t";

/**
 * A year selector for panels the server has already rendered. Every panel is
 * in the page; the switch only shows one and hides the rest, so the charts
 * cost no script and the choice costs no request. Without script the default
 * year shows (the buttons stay inert, the other panels stay hidden).
 */
export function YearSwitch({
  years,
  defaultYear,
  panels,
}: {
  years: number[];
  defaultYear: number;
  /** One node per entry of `years`, in the same order. */
  panels: ReactNode[];
}) {
  const t = useDict("news");
  const [year, setYear] = useState(defaultYear);
  return (
    <div>
      <div role="group" aria-label={t("budgetYearSwitchLabel")} className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className="text-xs text-ink-faint">
          {t("budgetYearSwitchLabel")}
        </span>
        <div className="inline-flex rounded-sm border border-line bg-surface-inset p-0.5">
          {years.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={year === option}
              onClick={() => setYear(option)}
              className={`min-h-11 min-w-14 rounded-[4px] px-3 text-sm tabular-nums transition-fast ${
                year === option ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {years.map((option, index) => (
        <div key={option} hidden={year !== option} className="mt-4">
          {panels[index]}
        </div>
      ))}
    </div>
  );
}
