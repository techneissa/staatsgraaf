"use client";

import { useT } from "@/components/i18n/use-t";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import type { ChangeViewValue } from "@/lib/change-url-state";

const OPTIONS: readonly { value: ChangeViewValue; label: string }[] = [
  { value: "chronological", label: "viewChronological" },
  { value: "people", label: "viewPeople" },
];

/** Chronological or per person: a segmented control of two toggle buttons. */
export function ViewToggle({ value, onChange }: { value: ChangeViewValue; onChange: (value: ChangeViewValue) => void }) {
  const t = useT("home");
  return (
    <div
      role="group"
      aria-label={t("viewToggleAria")}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-sm border border-line bg-surface-inset p-0.5"
    >
      <SlidingIndicator className="rounded-xs bg-surface shadow-sm" />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="inline-flex min-h-7 items-center justify-center whitespace-nowrap rounded-xs px-2.5 text-xs font-medium text-ink-muted transition-fast hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-sm pointer-coarse:min-h-11 pointer-coarse:px-3"
        >
          {t(option.label)}
        </button>
      ))}
    </div>
  );
}
