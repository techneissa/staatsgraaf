import { T } from "@/components/i18n/t";
import type { Recency } from "@/lib/change-clock";
import { agoPhrase } from "@/lib/change-clock";
import { LocalDate } from "./local-date";
import { TemplateT } from "./template-t";

/**
 * How long ago the newest change is, when that is not already "today" (the
 * list then opens on today). The snapshot date only appears when it differs
 * from the newest change, so the line never names the same day twice.
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
  const snapshotDay = snapshot?.slice(0, 10) ?? null;
  const sameDay = recency !== null && snapshotDay !== null && recency.date === snapshotDay;
  const isToday = recency !== null && recency.age <= 0;
  const showAgo = recency !== null && !isToday;
  const showSnapshot = snapshotDay !== null && !sameDay;
  if (!showAgo && !showSnapshot) return null;
  const ago = recency !== null ? agoPhrase(recency.age) : null;
  return (
    <p className={`text-xs text-ink-faint ${className}`.trim()}>
      {showAgo && ago !== null ? (
        <span className="text-ink-muted">
          <TemplateT k="chgLastChangeAgo" slots={{ ago: <T area="home" k={ago.key} vars={ago.vars} /> }} />
        </span>
      ) : null}
      {showAgo && showSnapshot ? (
        <span aria-hidden="true" className="text-line-strong">
          {" · "}
        </span>
      ) : null}
      {showSnapshot ? (
        <TemplateT k="chgSnapshot" slots={{ date: <LocalDate iso={snapshotDay} /> }} />
      ) : null}
    </p>
  );
}
