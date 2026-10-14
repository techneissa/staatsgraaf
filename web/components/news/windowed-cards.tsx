"use client";

import { useState, type ReactNode } from "react";
import { NewsItemCard } from "./news-item-card";
import type { NewsItemView } from "./news-view";
import { formatCountIn } from "@/lib/format";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { interpolate } from "@/lib/i18n/locales";
import type { NewsLanguage } from "@/lib/types";

/** Cards added per step of a windowed list. */
export const NEWS_WINDOW_STEP = 40;

export function ShowMoreButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex min-h-9 items-center rounded-pill border border-line bg-surface-raised px-4 text-sm font-medium text-ink transition-fast hover:border-accent/40 hover:bg-accent-soft hover:text-accent-text pointer-coarse:min-h-11"
    >
      {label}
    </button>
  );
}

/**
 * Cards in a window: the first `NEWS_WINDOW_STEP`, and a button that appends as many more,
 * so a long list never puts hundreds of cards in the page at once.
 */
export function WindowedCards({
  items,
  language,
  children,
}: {
  items: NewsItemView[];
  language: NewsLanguage;
  children?: ReactNode;
}) {
  const [shown, setShown] = useState(NEWS_WINDOW_STEP);
  const rest = items.length - shown;
  return (
    <>
      <ol className="mt-3 list-none space-y-2 p-0">
        {items.slice(0, shown).map((item) => (
          <li key={item.id}>
            <NewsItemCard item={item} displayLanguage={language} />
          </li>
        ))}
      </ol>
      {rest > 0 ? (
        <ShowMoreButton
          label={interpolate(NEWS_DICT.newsDayMore[language], { n: formatCountIn(Math.min(rest, NEWS_WINDOW_STEP), language) })}
          onClick={() => setShown((value) => value + NEWS_WINDOW_STEP)}
        />
      ) : null}
      {children}
    </>
  );
}
