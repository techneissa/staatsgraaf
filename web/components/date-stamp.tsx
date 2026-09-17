import { formatDate } from "@/lib/format";

export function DateStamp({ date, label }: { date: string; label?: string }) {
  return (
    <span className="text-xs text-ink-faint">
      {label ? `${label} ` : null}
      <time dateTime={date}>{formatDate(date)}</time>
    </span>
  );
}
