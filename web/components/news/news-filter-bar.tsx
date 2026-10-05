"use client";

import { useId } from "react";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import { formatCountIn } from "@/lib/format";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { interpolate } from "@/lib/i18n/locales";
import { NEWS_LANGUAGES, PUBLISHER_KINDS } from "@/lib/news-meta";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import type { NewsFilterState } from "@/lib/news-url-state";
import type { NewsLanguage, PublisherKind } from "@/lib/types";

/** A filter pill: 32 px with a fine pointer, 44 px on touch (NW-16), and it wraps instead of scrolling. */
export const pillClass = (active: boolean) =>
  `inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-pill border px-3 text-sm font-medium transition-fast pointer-coarse:min-h-11 ${
    active
      ? "border-accent/40 bg-accent-soft text-accent-text"
      : "border-line bg-surface-raised text-ink-muted hover:text-ink"
  }`;

const ALL_PUBLISHERS = "__all__";

/**
 * The compact filter bar shared by the news list and the day archives: the original
 * language as the primary row, then one native disclosure for outlet kind and outlet,
 * and the active filters as removable chips (NW-14). Everything wraps; nothing scrolls
 * sideways at any width. The caller owns the counts, because they depend on whether the
 * items that name nothing are shown.
 */
export function NewsFilterBar({
  uiLanguage,
  filters,
  update,
  languageCounts,
  kindCounts,
  rowCount,
  publishers,
  activePublisher,
}: {
  uiLanguage: NewsLanguage;
  filters: NewsFilterState;
  update: (patch: Partial<NewsFilterState>) => void;
  /** Items per original language and in total, for the language pills. */
  languageCounts: Record<"all" | NewsLanguage, number>;
  /** Items per outlet kind within the chosen language. */
  kindCounts: Map<PublisherKind, number>;
  /** Items within the chosen language, the count behind "all kinds". */
  rowCount: number;
  /** Outlets with their item counts within the chosen language and kind, largest first. */
  publishers: [string, number][];
  activePublisher: string | null;
}) {
  const messages = NEWS_MESSAGES[uiLanguage];
  const selectId = useId();
  const activeCount = (filters.kind !== "all" ? 1 : 0) + (activePublisher !== null ? 1 : 0);
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.kind !== "all") {
    chips.push({ key: "kind", label: messages.kindLabels[filters.kind], clear: () => update({ kind: "all", publisher: null }) });
  }
  if (activePublisher !== null) {
    chips.push({ key: "publisher", label: activePublisher, clear: () => update({ publisher: null }) });
  }

  return (
    <div role="group" aria-label={messages.filtersLabel} className="space-y-2">
      <div role="group" aria-label={messages.languageTabsLabel} className="relative flex flex-wrap gap-2">
        <SlidingIndicator variant="ring" className="rounded-pill border border-accent/40" />
        {(["all", ...NEWS_LANGUAGES] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filters.language === option}
            onClick={() => update({ language: option, publisher: null })}
            className={pillClass(filters.language === option)}
          >
            {option === "all" ? messages.allLanguagesLabel : messages.languageFilterLabels[option]}
            <span className="ml-1.5 tabular-nums text-ink-faint">{formatCountIn(languageCounts[option], uiLanguage)}</span>
          </button>
        ))}
      </div>

      <details className="motion-disclosure group">
        <summary
          className={`${pillClass(activeCount > 0)} cursor-pointer list-none gap-1.5 [&::-webkit-details-marker]:hidden`}
        >
          {NEWS_DICT.newsFilterMore[uiLanguage]}
          {activeCount > 0 ? (
            <span className="rounded-pill bg-accent/15 px-1.5 text-xs tabular-nums">{activeCount}</span>
          ) : null}
          <span aria-hidden="true" className="text-ink-faint transition-transform group-open:rotate-180">
            &#9662;
          </span>
        </summary>
        <div className="mt-2 space-y-3 rounded-md border border-line bg-surface-inset p-3">
          <div role="group" aria-label={messages.kindFilterLabel} className="flex flex-wrap gap-2">
            {(["all", ...PUBLISHER_KINDS] as const).map((option) => {
              const count = option === "all" ? rowCount : (kindCounts.get(option) ?? 0);
              if (option !== "all" && count === 0) return null;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filters.kind === option}
                  onClick={() => update({ kind: option, publisher: null })}
                  className={pillClass(filters.kind === option)}
                >
                  {option === "all" ? messages.allKindsLabel : messages.kindLabels[option]}
                  <span className="ml-1.5 tabular-nums text-ink-faint">{formatCountIn(count, uiLanguage)}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor={selectId} className="font-medium text-ink-muted">
              {messages.publisherSelectLabel}
            </label>
            <select
              id={selectId}
              value={activePublisher ?? ALL_PUBLISHERS}
              onChange={(event) => update({ publisher: event.target.value === ALL_PUBLISHERS ? null : event.target.value })}
              className="min-h-9 min-w-0 max-w-full flex-1 rounded-sm border border-line bg-surface-raised px-2 text-sm text-ink pointer-coarse:min-h-11 sm:flex-none"
            >
              <option value={ALL_PUBLISHERS}>{messages.allPublishersLabel}</option>
              {publishers.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({formatCountIn(count, uiLanguage)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>

      {chips.length > 0 ? (
        <ul aria-label={NEWS_DICT.newsFilterActiveLabel[uiLanguage]} className="flex list-none flex-wrap gap-2 p-0">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={chip.clear}
                aria-label={interpolate(NEWS_DICT.newsFilterRemove[uiLanguage], { name: chip.label })}
                className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-pill border border-accent/40 bg-accent-soft px-3 text-sm font-medium text-accent-text transition-fast hover:bg-accent/15 pointer-coarse:min-h-11"
              >
                <span className="min-w-0 truncate" title={chip.label}>
                  {chip.label}
                </span>
                <span aria-hidden="true">&times;</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
