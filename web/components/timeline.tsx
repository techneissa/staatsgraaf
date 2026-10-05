import type { ReactNode } from "react";
import { PeriodT } from "@/components/change/local-date";
import { RailItem, RailList } from "@/components/change/rail";
import { T } from "@/components/i18n/t";

export type TimelineItem = {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  /**
   * A ready period label. Prefer `start` and `end`: they render in the site
   * locale ("Sinds 1 juli 2026" or "Since 1 July 2026"). `period` wins when
   * both are given, for callers that still pass a Dutch string.
   */
  period?: ReactNode;
  start?: string | null;
  end?: string | null;
  current: boolean;
  /** Short status labels (acting, entry mode, end reason, fractie). Strings or translated nodes. */
  badges?: ReactNode[];
  /** A quiet source link, shown last on the meta line. */
  source?: ReactNode;
};

/**
 * The rail dot: a larger accent disc for a current role, a small grey disc
 * for a past one. Both are solid, so the rail needs no background patch and
 * the list works on any surface. The "Huidig" label says it in text too.
 */
function Dot({ current }: { current: boolean }) {
  return current ? (
    <span className="block h-2.5 w-2.5 rounded-pill bg-accent" />
  ) : (
    <span className="block h-2 w-2 rounded-pill bg-ink-faint" />
  );
}

/**
 * A history of roles on a rail: newest first, one dot per role, portrait or
 * initials where a person is shown, peek links, the period in the site
 * locale, status labels and a quiet source. No boxes; rows are divided by
 * hairlines.
 */
export function Timeline({ items, label }: { items: TimelineItem[]; label: string }) {
  return (
    <RailList label={label}>
      {items.map((item, index) => {
        const period =
          item.period ?? (item.start !== undefined ? <PeriodT start={item.start} end={item.end ?? null} style="short" /> : null);
        const badges = item.badges ?? [];
        return (
          <RailItem
            key={item.id}
            mark={<Dot current={item.current} />}
            first={index === 0}
            last={index === items.length - 1}
            markTop={10}
            patch={false}
          >
            <div className="flex min-w-0 gap-3">
              {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-5 text-ink [overflow-wrap:anywhere]">{item.title}</p>
                {item.meta ? (
                  <p className="mt-0.5 text-sm leading-snug text-ink-muted [overflow-wrap:anywhere]">{item.meta}</p>
                ) : null}
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-faint">
                  {period !== null ? <span className="tabular-nums">{period}</span> : null}
                  {/* "Since ..." and the accent dot already say the role is current; a badge only when no period shows. */}
                  {item.current && period === null ? (
                    <span className="rounded-xs bg-accent-soft px-1.5 py-px text-[11px] font-medium text-accent-text">
                      <T area="home" k="currentBadge" />
                    </span>
                  ) : null}
                  {badges.map((badge, badgeIndex) => (
                    <span
                      key={badgeIndex}
                      className="rounded-xs bg-surface-inset px-1.5 py-px text-[11px] font-medium text-ink-muted"
                    >
                      {badge}
                    </span>
                  ))}
                  {item.source ?? null}
                </p>
              </div>
            </div>
          </RailItem>
        );
      })}
    </RailList>
  );
}
