import { T } from "@/components/i18n/t";
import type { Recency } from "@/lib/change-clock";
import { agoPhrase } from "@/lib/change-clock";
import { LocalDate } from "./local-date";
import { TemplateT } from "./template-t";

/**
 * "Laatste wijziging 19 september 2026, 16 dagen geleden" and, quieter,
 * "Gegevens per 1 oktober 2026". The age counts from the build day; the
 * snapshot date says how fresh the data behind it is.
 */
export function LastChangeLine({
  recency,
  snapshot,
  className = "",
}: {
  recency: Recency | null;
  snapshot: string | null;
  className?: string;
}) {
  if (recency === null && snapshot === null) return null;
  const ago = recency !== null ? agoPhrase(recency.age) : null;
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-ink-faint ${className}`.trim()}>
      {recency !== null && ago !== null ? (
        <span className="text-ink-muted">
          <TemplateT
            k="chgLastChange"
            slots={{ date: <LocalDate iso={recency.date} />, ago: <T area="home" k={ago.key} vars={ago.vars} /> }}
          />
        </span>
      ) : null}
      {recency !== null && snapshot !== null ? (
        <span aria-hidden="true" className="text-line-strong">
          ·
        </span>
      ) : null}
      {snapshot !== null ? (
        <span className="whitespace-nowrap">
          <TemplateT k="chgSnapshot" slots={{ date: <LocalDate iso={snapshot} /> }} />
        </span>
      ) : null}
    </p>
  );
}
