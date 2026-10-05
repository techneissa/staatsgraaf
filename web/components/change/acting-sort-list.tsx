"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide";
import { Morph } from "@/components/icons/morph";
import { useT } from "@/components/i18n/use-t";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import { sortActing, visibleLimit, type ActingSort } from "@/lib/change-feed";
import { ChangeKindGlyph } from "./change-glyph";
import { RailItem, RailList } from "./rail";

export type ActingItem = {
  id: string;
  /** Start of the acting tenure (YYYY-MM-DD); null when the source gives none. */
  since: string | null;
  name: string;
  /** The row, built on the server so peek links keep resolving there. */
  node: ReactNode;
};

const OPTIONS: readonly { value: ActingSort; label: string }[] = [
  { value: "newest", label: "chgSortNewest" },
  { value: "name", label: "chgSortName" },
];

const itemKey = (item: ActingItem) => ({ start: item.since, name: item.name });

/**
 * The current acting officials on a rail, newest start date first with a
 * toggle for A-Z. Shows ten, and everything when no more than three would
 * hide behind the button.
 */
export function ActingSortList({ items }: { items: ActingItem[] }) {
  const t = useT("home");
  const [sort, setSort] = useState<ActingSort>("newest");
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() => sortActing(items, sort, itemKey), [items, sort]);
  const limit = visibleLimit(sorted.length);
  const hidden = sorted.length - limit;
  const visible = open ? sorted : sorted.slice(0, limit);
  return (
    <>
      <div
        role="group"
        aria-label={t("chgSortLabel")}
        className="mb-1 inline-flex shrink-0 items-center gap-0.5 rounded-sm border border-line bg-surface-inset p-0.5"
      >
        <SlidingIndicator className="rounded-xs bg-surface shadow-sm" />
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={sort === option.value}
            onClick={() => setSort(option.value)}
            className="inline-flex min-h-7 items-center justify-center whitespace-nowrap rounded-xs px-2.5 text-xs font-medium text-ink-muted transition-fast hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-sm pointer-coarse:min-h-11 pointer-coarse:px-3"
          >
            {t(option.label)}
          </button>
        ))}
      </div>
      <RailList>
        {visible.map((item, index) => (
          <RailItem key={item.id} mark={<ChangeKindGlyph kind="acting" />} first={index === 0} last={index === visible.length - 1} markTop={8}>
            {item.node}
          </RailItem>
        ))}
      </RailList>
      {hidden > 0 ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="mt-2 inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-sm border border-line px-3 text-sm font-medium text-ink transition-fast hover:border-line-strong pointer-coarse:min-h-11 sm:w-auto"
        >
          {open ? t("showFewerActing") : t("showAllActing", { n: sorted.length })}
          <Morph icon={open ? ChevronUp : ChevronDown} size={14} />
        </button>
      ) : null}
    </>
  );
}
