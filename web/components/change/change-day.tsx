import type { ReactNode } from "react";
import { T } from "@/components/i18n/t";
import type { ChangeDisplayKind } from "@/lib/changes";
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
  count,
  sticky = false,
}: {
  date: string;
  reference: string;
  items: ChangeDayItem[];
  count?: number;
  sticky?: boolean;
}) {
  const n = count ?? items.length;
  const headingId = `dag-${date}`;
  return (
    <section aria-labelledby={headingId}>
      <div
        className={`flex items-baseline justify-between gap-2 border-b border-line py-2 ${
          sticky ? "sticky top-0 z-10 -mx-4 bg-canvas/95 px-4 backdrop-blur-sm lg:-mx-8 lg:px-8" : ""
        }`}
      >
        <h3 id={headingId} className="text-sm font-semibold text-ink">
          <DayLabel date={date} reference={reference} />
        </h3>
        <span className="text-xs tabular-nums text-ink-faint">
          {n === 1 ? <T area="home" k="dayCountOne" /> : <T area="home" k="dayCount" vars={{ n }} />}
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
