"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide";
import { Morph } from "@/components/icons/morph";
import { useT } from "@/components/i18n/use-t";
import { RailItem, RailList } from "./rail";

export type PersonRailItem = { id: string; mark: ReactNode; node: ReactNode };

/**
 * The events of one card on a rail: the first `max` show, the rest sit behind
 * one button. The items arrive as server-rendered nodes, so peek links keep
 * resolving on the server; only the open state lives here. The rail is drawn
 * from the visible items, so it never dangles above a closed button.
 */
export function PersonRail({
  items,
  labelKey,
  labelName,
  max = 3,
}: {
  items: PersonRailItem[];
  labelKey: string;
  labelName: string;
  max?: number;
}) {
  const t = useT("home");
  const [open, setOpen] = useState(false);
  const hidden = Math.max(0, items.length - max);
  const visible = open || hidden === 0 ? items : items.slice(0, max);
  return (
    <>
      <RailList label={t(labelKey, { name: labelName })} className="mt-1">
        {visible.map((item, index) => (
          <RailItem key={item.id} mark={item.mark} first={index === 0} last={index === visible.length - 1}>
            {item.node}
          </RailItem>
        ))}
      </RailList>
      {hidden > 0 ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="ml-9 mt-1 inline-flex min-h-8 items-center gap-1.5 rounded-sm px-1 text-sm font-medium text-accent-text transition-fast hover:text-ink pointer-coarse:min-h-11"
        >
          {open ? t("peopleShowLess") : t("peopleShowMore", { count: hidden })}
          <Morph icon={open ? ChevronUp : ChevronDown} size={14} />
        </button>
      ) : null}
    </>
  );
}
