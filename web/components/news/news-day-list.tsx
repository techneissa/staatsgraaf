"use client";

import { useState } from "react";
import { NewsItemCard } from "./news-item-card";
import type { NewsItemView } from "./news-view";
import { ShowAllList } from "./show-all-list";
import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/i18n/language-provider";
import { formatCountIn } from "@/lib/format";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { interpolate } from "@/lib/i18n/locales";
import type { NewsLanguage } from "@/lib/types";

export type NewsDayHour = { hour: string; label: string; items: NewsItemView[] };

/**
 * The hour sections of a day archive. Like the explorer it shows the items that name
 * the state and keeps the rest behind a "show all news" toggle (docs/adr/0021).
 * `fixedLanguage` pins the interface language on the English route.
 */
export function NewsDayList({
  hours,
  total,
  relevantTotal,
  fixedLanguage,
}: {
  hours: NewsDayHour[];
  total: number;
  relevantTotal: number;
  fixedLanguage?: NewsLanguage;
}) {
  const siteLocale = useLocale();
  const lang: NewsLanguage = fixedLanguage ?? siteLocale;
  const [showAll, setShowAll] = useState(false);

  if (total === 0) {
    return (
      <section className="py-6">
        <EmptyState title={NEWS_DICT.newsDayEmpty[lang]} />
      </section>
    );
  }

  const sections = hours
    .map((hour) => ({ ...hour, items: showAll ? hour.items : hour.items.filter((item) => item.relevant) }))
    .filter((hour) => hour.items.length > 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line py-4">
        <p role="status" className="text-sm text-ink-muted">
          {interpolate(NEWS_DICT.newsRelevantCount[lang], {
            n: formatCountIn(relevantTotal, lang),
            total: formatCountIn(total, lang),
          })}
        </p>
        <button
          type="button"
          aria-pressed={showAll}
          onClick={() => setShowAll((value) => !value)}
          className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-pill border px-3 text-sm font-medium transition-fast sm:min-h-8 ${
            showAll
              ? "border-accent/40 bg-accent-soft text-accent-text"
              : "border-line bg-surface-raised text-ink-muted hover:text-ink"
          }`}
        >
          {NEWS_DICT.newsShowAll[lang]}
        </button>
      </div>

      {sections.length === 0 ? (
        <section className="py-6">
          <EmptyState
            title={NEWS_DICT.newsRelevantEmptyTitle[lang]}
            description={NEWS_DICT.newsRelevantEmptyDescription[lang]}
          />
        </section>
      ) : (
        sections.map((hour) => (
          <section key={hour.hour} aria-labelledby={`uur-${hour.hour}`} className="border-b border-line py-6">
            <h2 id={`uur-${hour.hour}`} className="text-lg font-semibold tracking-tight text-ink">
              {hour.label}
            </h2>
            <ShowAllList
              as="ol"
              items={hour.items}
              initial={8}
              minHidden={4}
              locale={fixedLanguage}
              className="mt-3 list-none space-y-3 p-0"
              keyOf={(item) => item.id}
              render={(item) => <NewsItemCard item={item} displayLanguage={fixedLanguage} />}
            />
          </section>
        ))
      )}
    </>
  );
}
