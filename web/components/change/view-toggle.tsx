"use client";

import { CalendarDays, Users } from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { useT } from "@/components/i18n/use-t";
import type { ChangeViewValue } from "@/lib/change-url-state";

const OPTIONS: readonly { value: ChangeViewValue; label: "viewChronological" | "viewPeople"; icon: typeof CalendarDays }[] = [
  { value: "chronological", label: "viewChronological", icon: CalendarDays },
  { value: "people", label: "viewPeople", icon: Users },
];

/** Chronological or per person: two icon buttons, the label is the accessible name. */
export function ViewToggle({ value, onChange }: { value: ChangeViewValue; onChange: (value: ChangeViewValue) => void }) {
  const t = useT("home");
  return (
    <div role="group" aria-label={t("viewToggleAria")} className="inline-flex shrink-0 items-center gap-0.5">
      {OPTIONS.map((option) => {
        const pressed = value === option.value;
        const label = t(option.label);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            aria-label={label}
            title={label}
            onClick={() => onChange(option.value)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-sm transition-fast pointer-coarse:h-11 pointer-coarse:w-11 ${
              pressed ? "bg-surface-inset text-ink" : "text-ink-faint hover:text-ink"
            }`}
          >
            <LucideIcon icon={option.icon} size={16} strokeWidth={1.8} />
          </button>
        );
      })}
    </div>
  );
}
