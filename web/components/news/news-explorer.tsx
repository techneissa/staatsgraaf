"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { NewsFilterBar, pillClass } from "./news-filter-bar";
import { NewsItemCard } from "./news-item-card";
import type { NewsItemView } from "./news-view";
import { CARD_ITEM_CLASS, NEWS_WINDOW_STEP, ShowMoreButton } from "./windowed-cards";
import { useNewsFilters } from "./use-news-filters";
import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/i18n/language-provider";
import { KindGlyph } from "@/components/kind-glyph";
import { useSettled } from "@/components/motion/use-settled";
import { loadPeekRecord } from "@/components/peek/peek-provider";
import { formatCountIn } from "@/lib/format";
import { newsFacets, rowMatches, type FacetRow } from "@/lib/news-facets";
import { NEWS_LANGUAGES, type RecencyGroupKey } from "@/lib/news-meta";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { readEntryState, writeEntryState } from "@/lib/news-entry-state";
import { sumBuckets, translationSummary, type LanguageCounts } from "@/lib/news-stats";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { interpolate } from "@/lib/i18n/locales";
import type { PeekKind } from "@/lib/peek";
import type { NewsLanguage, PublisherKind } from "@/lib/types";

export type NewsExplorerDay = {
  date: string;
  label: string;
  count: number;
  /** How many of the day's items name the state. */
  relevantCount: number;
};

/** The filter-relevant facts of an item that is not loaded as a card. */
export type NewsExplorerRow = [kind: PublisherKind, publisher: string];

export type NewsExplorerGroup = {
  key: RecencyGroupKey;
  label: string;
  /** The real date or time behind the relative label, for a page that outlives its build. */
  detail: string;
  /**
   * Per original language: the true totals in the dataset (all items, and those that
   * name the state), every relevant item as a card, the newest other items as cards, and
   * kind and outlet of the other items left out, so every count and filter is complete.
   */
  languages: Record<
    NewsLanguage,
    LanguageCounts & { items: NewsItemView[]; unloaded: NewsExplorerRow[] }
  >;
  /** Day archive pages that hold everything in this group. */
  days: NewsExplorerDay[];
};

type LanguageFilter = "all" | NewsLanguage;

type EntityFilter = { id: string; label: string; href: string | null; kind: PeekKind | null };

/**
 * The news section: items that name the state, in every original language, shown
 * in the interface language with machine translations where they exist
 * (docs/adr/0016). Items that name nothing in the dataset sit behind a "show all
 * news" toggle (docs/adr/0021). Filters: original language, outlet kind, outlet,
 * and, from a peek popover's news link, one mentioned entity (`?entity=<id>`).
 *
 * `fixedLanguage` pins the interface language (the /news/ route is English);
 * without it the section follows the site language.
 */
export function NewsExplorer({
  groups,
  initialVisible,
  fixedLanguage,
  archiveBase,
}: {
  groups: NewsExplorerGroup[];
  initialVisible: number;
  fixedLanguage?: NewsLanguage;
  /** Path prefix for day archive links, for example "/nieuws" or "/news". */
  archiveBase: string;
}) {
  const siteLocale = useLocale();
  const uiLanguage: NewsLanguage = fixedLanguage ?? siteLocale;
  const messages = NEWS_MESSAGES[uiLanguage];
  const { filters, update, ready } = useNewsFilters();
  const { language, kind } = filters;
  const showAll = filters.showAll;
  const relevantOnly = !showAll;
  const [entityMeta, setEntityMeta] = useState<Omit<EntityFilter, "id"> | null>(null);
  const settled = useSettled();

  const merged = useMemo(
    () =>
      groups.map((group) => ({
        group,
        items: [...group.languages.nl.items, ...group.languages.en.items].sort(
          (a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id),
        ),
        total: group.languages.nl.total + group.languages.en.total,
      })),
    [groups],
  );
  const loaded = useMemo(() => merged.flatMap((entry) => entry.items), [merged]);

  // ?entity=<id>: the label of the mentioned entity, from a loaded card or the peek index.
  const entityId = filters.entity;
  useEffect(() => {
    if (entityId === null) {
      setEntityMeta(null);
      return;
    }
    const mention = loaded.flatMap((item) => item.entities).find((entry) => entry.id === entityId);
    setEntityMeta({ label: mention?.label ?? entityId, href: mention?.href ?? null, kind: mention?.peekKind ?? null });
    if (mention) return;
    let cancelled = false;
    loadPeekRecord(entityId)
      .then((record) => {
        if (!cancelled && record) setEntityMeta({ label: record.name, href: record.href, kind: record.kind });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [entityId, loaded]);
  const entity: EntityFilter | null = entityId === null ? null : { id: entityId, ...(entityMeta ?? { label: entityId, href: null, kind: null }) };

  const buckets = useMemo(() => sumBuckets(groups.map((group) => group.languages)), [groups]);
  const totals: Record<LanguageFilter, number> = { all: buckets.nl.total + buckets.en.total, nl: buckets.nl.total, en: buckets.en.total };
  const relevantTotals: Record<LanguageFilter, number> = {
    all: buckets.nl.relevantTotal + buckets.en.relevantTotal,
    nl: buckets.nl.relevantTotal,
    en: buckets.en.relevantTotal,
  };
  const shownTotals = relevantOnly ? relevantTotals : totals;

  // Every relevant item is a card; with "show all" the rest is counted from compact rows.
  const countUnloaded = showAll && entity === null;
  const cards = relevantOnly ? loaded.filter((item) => item.relevant) : loaded;
  const rowsOf = (group: NewsExplorerGroup): FacetRow[] =>
    countUnloaded
      ? NEWS_LANGUAGES.flatMap((lang) =>
          group.languages[lang].unloaded.map(([rowKind, rowPublisher]): FacetRow => ({ kind: rowKind, publisher: rowPublisher, language: lang })),
        )
      : [];
  const unloadedRows = groups.flatMap(rowsOf);
  const entityCards = entity ? cards.filter((item) => item.entities.some((entry) => entry.id === entity.id)) : cards;
  const { languageRows: rows, kindCounts, publishers, activePublisher } = newsFacets([...entityCards, ...unloadedRows], filters);
  const filtering = kind !== "all" || activePublisher !== null || entity !== null;

  // An outlet in the address that no longer applies (a typo, or another mode) is dropped from it.
  useEffect(() => {
    if (ready && filters.publisher !== null && activePublisher === null) update({ publisher: null });
  }, [ready, filters.publisher, activePublisher, update]);

  const matchesRow = (row: FacetRow) => rowMatches(row, filters, activePublisher);
  const matches = (item: NewsItemView) =>
    matchesRow(item) && (entity === null || item.entities.some((entry) => entry.id === entity.id));

  // One entry per recency group with a match in the current mode, language and filters.
  const sections = merged
    .map((entry) => {
      const inBucket = language === "all" ? entry.items : entry.group.languages[language].items;
      const bucketItems = relevantOnly ? inBucket.filter((item) => item.relevant) : inBucket;
      const filtered = bucketItems.filter(matches);
      const unloaded = rowsOf(entry.group).filter(matchesRow).length;
      return { group: entry.group, filtered, unloaded };
    })
    .filter(({ filtered, unloaded }) => filtered.length + unloaded > 0);
  const resultCount = sections.reduce((sum, { filtered, unloaded }) => sum + filtered.length + unloaded, 0);

  const translated = translationSummary(buckets, uiLanguage, language, relevantOnly);
  const countWord = (count: number) =>
    interpolate(count === 1 ? NEWS_DICT.newsFilterCountWordOne[uiLanguage] : NEWS_DICT.newsFilterCountWord[uiLanguage], {
      n: formatCountIn(count, uiLanguage),
    });

  return (
    <div data-settled={settled ? "" : undefined}>
      <p className="mb-3 text-xs text-ink-faint">
        {translated !== null ? (
          <>
            {interpolate(NEWS_DICT.newsTranslatedCount[uiLanguage], {
              translated: formatCountIn(translated.translated, uiLanguage),
              total: formatCountIn(translated.total, uiLanguage),
            })}{" "}
          </>
        ) : null}
        <a href="/methodiek/#machinevertaling" className="underline decoration-line underline-offset-2 hover:text-ink">
          {translated !== null ? NEWS_DICT.newsTranslatedMethodLink[uiLanguage] : messages.card.translationNote}
        </a>
      </p>

      <NewsFilterBar
        uiLanguage={uiLanguage}
        filters={filters}
        update={update}
        languageCounts={shownTotals}
        kindCounts={kindCounts}
        rowCount={rows.length}
        publishers={publishers}
        activePublisher={activePublisher}
      />

      {entity !== null ? (
        <div className="mt-2 rounded-md border border-line bg-surface-inset p-3 text-sm">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-ink-muted">{messages.entityFilterLabel}</span>
            <span lang="nl" className="inline-flex min-w-0 items-center gap-1.5 font-medium text-ink">
              {entity.kind ? <KindGlyph kind={entity.kind} /> : null}
              <span className="min-w-0 break-words">{entity.label}</span>
            </span>
            <button
              type="button"
              onClick={() => update({ entity: null })}
              className="ml-auto inline-flex min-h-8 items-center rounded-sm border border-line bg-surface px-3 text-sm font-medium text-ink-muted hover:text-ink pointer-coarse:min-h-11"
            >
              {messages.entityFilterClear}
            </button>
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            {interpolate(NEWS_DICT.newsEntityResultCount[uiLanguage], { n: formatCountIn(resultCount, uiLanguage) })}
            {entity.href ? (
              <>
                {" "}
                <Link href={entity.href} className="inline-flex text-accent-text underline-offset-2 hover:underline pointer-coarse:min-h-11 pointer-coarse:items-center">
                  {interpolate(NEWS_DICT.newsEntityPageLink[uiLanguage], { name: entity.label })}
                </Link>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      <noscript>
        <p className="mt-3 text-xs text-ink-faint">{messages.noscript}</p>
      </noscript>
      {totals[language] === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={messages.emptyByLanguage[language === "all" ? uiLanguage : language].title}
            description={messages.emptyByLanguage[language === "all" ? uiLanguage : language].description}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p role="status" aria-atomic="true" className="text-sm text-ink-muted">
              {interpolate(NEWS_DICT.newsRelevantCount[uiLanguage], {
                n: formatCountIn(relevantTotals[language], uiLanguage),
                total: formatCountIn(totals[language], uiLanguage),
              })}
              {filtering
                ? ` · ${resultCount === 0 ? messages.noItemsFilterLabel : interpolate(NEWS_DICT.newsFilterResultCount[uiLanguage], { n: countWord(resultCount) })}`
                : ""}
            </p>
            <button type="button" aria-pressed={showAll} onClick={() => update({ showAll: !showAll })} className={pillClass(showAll)}>
              {NEWS_DICT.newsShowAll[uiLanguage]}
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="mt-6">
              {filtering ? (
                <EmptyState title={messages.noItemsFilterLabel} />
              ) : (
                <EmptyState
                  title={NEWS_DICT.newsRelevantEmptyTitle[uiLanguage]}
                  description={NEWS_DICT.newsRelevantEmptyDescription[uiLanguage]}
                />
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-8">
              {sections.map(({ group, filtered, unloaded }) => {
                const visible = filtered.slice(0, initialVisible);
                const hidden = filtered.slice(initialVisible);
                const matched = filtered.length + unloaded;
                const headingId = `groep-${group.key}`;
                return (
                  <section key={group.key} aria-labelledby={headingId}>
                    <div className="sticky top-0 z-10 -mx-4 flex items-baseline justify-between gap-2 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur-sm">
                      <h2 id={headingId} className="text-xs font-semibold text-ink-faint">
                        {messages.groupLabels[group.key]}
                        {group.detail !== "" ? <span className="ms-1.5 font-normal">· {group.detail}</span> : null}
                      </h2>
                      <span className="text-xs tabular-nums text-ink-faint">
                        {unloaded > 0
                          ? `${formatCountIn(filtered.length, uiLanguage)} ${messages.ofWord} ${formatCountIn(matched, uiLanguage)}`
                          : formatCountIn(filtered.length, uiLanguage)}{" "}
                        {matched === 1 ? messages.itemsWordSingular : messages.itemsWordPlural}
                      </span>
                    </div>

                    {filtered.length === 0 ? (
                      <p className="mt-3 text-sm text-ink-faint">{messages.noItemsFilterLabel}</p>
                    ) : (
                      <>
                        <ol className="mt-3 list-none space-y-2 p-0">
                          {visible.map((item) => (
                            <li key={item.id} className={CARD_ITEM_CLASS}>
                              <NewsItemCard item={item} displayLanguage={uiLanguage} />
                            </li>
                          ))}
                        </ol>
                        {hidden.length > 0 ? (
                          <MoreItems
                            groupKey={group.key}
                            items={hidden}
                            language={uiLanguage}
                            showMore={`${messages.showMoreLabel} (${formatCountIn(hidden.length, uiLanguage)})`}
                            showLess={messages.showLessLabel}
                          />
                        ) : null}
                      </>
                    )}
                    {unloaded > 0 ? (
                      <p className="mt-3 text-xs text-ink-faint">
                        {interpolate(NEWS_DICT.newsTruncatedNote[uiLanguage], { count: formatCountIn(unloaded, uiLanguage) })}{" "}
                        <a href="#eerdere-dagen" className="text-accent-text underline-offset-2 hover:underline">
                          {NEWS_DICT.newsEarlierDays[uiLanguage]}
                        </a>
                      </p>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
          <DayArchiveNav
            days={groups.flatMap((group) => group.days)}
            archiveBase={archiveBase}
            language={uiLanguage}
            relevantOnly={relevantOnly}
          />
        </>
      )}
    </div>
  );
}

/**
 * The tail of a group behind a native disclosure. The cards are only built once the
 * reader opens it, and then in windows of `NEWS_WINDOW_STEP`, so the page ships and paints
 * the first ten per group, not hundreds. Which groups are open is kept with the history
 * entry, so Back returns to a list that is as long as it was (NW-8).
 */
function MoreItems({
  groupKey,
  items,
  language,
  showMore,
  showLess,
}: {
  groupKey: RecencyGroupKey;
  items: NewsItemView[];
  language: NewsLanguage;
  showMore: string;
  showLess: string;
}) {
  const [opened, setOpened] = useState(false);
  const [shown, setShown] = useState(NEWS_WINDOW_STEP);
  const [restored, setRestored] = useState(false);
  useLayoutEffect(() => {
    const entry = readEntryState();
    const open = Array.isArray(entry.open) ? (entry.open as string[]) : [];
    const count = typeof entry[`shown-${groupKey}`] === "number" ? (entry[`shown-${groupKey}`] as number) : NEWS_WINDOW_STEP;
    if (open.includes(groupKey)) {
      setOpened(true);
      setShown(Math.max(NEWS_WINDOW_STEP, count));
      setRestored(true);
    }
  }, [groupKey]);
  const rest = items.length - shown;
  return (
    <details
      className="motion-disclosure group mt-3"
      open={restored ? true : undefined}
      onToggle={(event) => {
        const open = event.currentTarget.open;
        if (open) setOpened(true);
        const entry = readEntryState();
        const list = (Array.isArray(entry.open) ? (entry.open as string[]) : []).filter((key) => key !== groupKey);
        writeEntryState({ open: open ? [...list, groupKey] : list });
      }}
    >
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-pill border border-line bg-surface-raised px-4 text-sm font-medium text-ink transition-fast hover:border-accent/40 hover:bg-accent-soft hover:text-accent-text pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">{showMore}</span>
        <span className="hidden group-open:inline">{showLess}</span>
      </summary>
      {opened ? (
        <>
          <ol className="mt-3 list-none space-y-2 p-0">
            {items.slice(0, shown).map((item) => (
              <li key={item.id} className={CARD_ITEM_CLASS}>
                <NewsItemCard item={item} displayLanguage={language} />
              </li>
            ))}
          </ol>
          {rest > 0 ? (
            <ShowMoreButton
              label={interpolate(NEWS_DICT.newsDayMore[language], { n: formatCountIn(Math.min(rest, NEWS_WINDOW_STEP), language) })}
              onClick={() => {
                const next = shown + NEWS_WINDOW_STEP;
                setShown(next);
                writeEntryState({ [`shown-${groupKey}`]: next });
              }}
            />
          ) : null}
        </>
      ) : null}
    </details>
  );
}

/** Days shown before the rest of the day archive links fold away. */
const DAYS_INITIAL = 7;

/**
 * The way to every item: one link per day archive, newest first, with the number of
 * items that name the state (or all items, with "show all news" on). Long runs of days
 * fold behind a toggle so the section does not open with a wall of dates.
 */
function DayArchiveNav({
  days,
  archiveBase,
  language,
  relevantOnly,
}: {
  days: NewsExplorerDay[];
  archiveBase: string;
  language: NewsLanguage;
  relevantOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (days.length === 0) return null;
  const fold = days.length > DAYS_INITIAL + 2;
  const shown = fold && !open ? days.slice(0, DAYS_INITIAL) : days;
  const dict = NEWS_DICT;
  return (
    <nav id="eerdere-dagen" aria-labelledby="eerdere-dagen-titel" className="mt-10 border-t border-line pt-5">
      <h2 id="eerdere-dagen-titel" className="text-sm font-semibold text-ink">
        {dict.newsEarlierDays[language]}
      </h2>
      <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
        {shown.map((day) => (
          <li key={day.date}>
            <Link
              href={`${archiveBase}/${day.date}/`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line bg-surface-raised px-3 text-sm text-ink-muted transition-fast hover:border-accent/40 hover:text-accent-text pointer-coarse:min-h-11"
            >
              {day.label}
              <span className="tabular-nums text-ink-faint">{formatCountIn(relevantOnly ? day.relevantCount : day.count, language)}</span>
            </Link>
          </li>
        ))}
        {fold ? (
          <li>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="inline-flex min-h-9 items-center rounded-pill px-3 text-sm font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline pointer-coarse:min-h-11"
            >
              {open
                ? dict.newsFewerDays[language]
                : interpolate(dict.newsMoreDays[language], { count: formatCountIn(days.length - DAYS_INITIAL, language) })}
            </button>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
