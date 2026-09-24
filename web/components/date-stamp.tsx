import { LocalDate } from "@/components/content/local-date";

export function DateStamp({ date, label }: { date: string; label?: string }) {
  return (
    <span className="text-xs text-ink-faint">
      {label ? `${label} ` : null}
      <LocalDate iso={date} />
    </span>
  );
}
