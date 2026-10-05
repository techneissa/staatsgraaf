"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { EmptyStateT } from "./empty-state-t";
import { AriaLabelT } from "./aria-label-t";
import type { ChangeFilterValue } from "@/lib/change-url-state";
import type { ChangeKind } from "@/lib/types";

/** What the explorer has chosen; the cards below it show only the people it leaves in. */
export type PersonCardFilter = { kind: ChangeFilterValue; day: string | null };

const PersonCardFilterContext = createContext<PersonCardFilter>({ kind: "all", day: null });

export const PersonCardFilterProvider = PersonCardFilterContext.Provider;

/** One person or seat: the kinds and days of their events decide whether a filter keeps the card. */
export type PersonCardEntry = { key: string; kinds: ChangeKind[]; days: string[]; node: ReactNode };

/**
 * The grid of person and seat cards. Client side only to follow the kind and
 * day filters; the cards themselves arrive as server-rendered nodes, so this
 * file imports nothing from the data layer. A card stays when any of its
 * events matches the filters, and then shows the person's whole window. Cards
 * flow into columns by the width of the container, not the viewport.
 */
export function PersonCardList({ cards }: { cards: PersonCardEntry[] }) {
  const { kind, day } = useContext(PersonCardFilterContext);
  const shown = cards.filter(
    (card) => (kind === "all" || card.kinds.includes(kind as ChangeKind)) && (day === null || card.days.includes(day)),
  );
  if (shown.length === 0) {
    return <EmptyStateT title={cards.length === 0 || (kind === "all" && day === null) ? "peopleEmpty" : "kindFilteredEmpty"} />;
  }
  return (
    <AriaLabelT k="peopleListAria">
      <div className="@container">
        <ul className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
          {shown.map((card) => (
            <li key={card.key} className="min-w-0">
              {card.node}
            </li>
          ))}
        </ul>
      </div>
    </AriaLabelT>
  );
}
