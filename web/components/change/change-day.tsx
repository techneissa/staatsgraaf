import type { ReactNode } from "react";
import type { EntryCounts } from "@/lib/change-feed";
import type { ChangeDisplayKind } from "@/lib/changes";
import { CountsText } from "./counts-text";
import { ChangeKindGlyph } from "./change-glyph";
import { DayLabel } from "./local-date";
import { RailItem, RailList } from "./rail";

export type ChangeDayItem = {
  id: string;
  displayKind: ChangeDisplayKind;
  node: ReactNode;
};

/**
 * One day of changes: a date header with the count, then the rows on a rail
 * with the kind glyph as each dot. With `sticky` the header sticks to the top
 * of the scroll container (the left column on lg, the window below lg) until
 * the day ends; it bleeds to the column edge so rows pass under it cleanly.
 */
export function ChangeDay({
  date,
  reference,
  items,
  counts,
  sticky = false,
}: {
  date: string;
  reference: string;
  items: ChangeDayItem[];
  /** The day's changes and people; the item count when omitted. */
  counts?: EntryCounts;
  sticky?: boolean;
}) {
  const headingId = `dag-${date}`;
  return (
    <section aria-labelledby={headingId}>
      <div
        className={`flex items-baseline justify-between gap-2 border-b border-line py-2 ${
          sticky ? "sticky top-0 z-10 -mx-4 bg-canvas px-4 lg:bg-canvas/95 lg:-mx-8 lg:px-8 lg:backdrop-blur-sm" : ""
        }`}
      >
        <h3 id={headingId} className="text-sm font-semibold text-ink">
          <DayLabel date={date} reference={reference} />
        </h3>
        <span className="text-xs tabular-nums text-ink-faint">
          <CountsText changes={counts?.changes ?? items.length} people={counts?.people ?? 0} />
        </span>
      </div>
      <RailList className="mt-1">
        {items.map((item, index) => (
          <RailItem
            key={item.id}
            mark={<ChangeKindGlyph kind={item.displayKind} />}
            first={index === 0}
            last={index === items.length - 1}
            markTop={8}
          >
            {item.node}
          </RailItem>
        ))}
      </RailList>
    </section>
  );
}
