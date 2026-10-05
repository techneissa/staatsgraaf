"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { NewsItemCard } from "./news-item-card";
import type { NewsItemView } from "./news-view";
import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/i18n/language-provider";
import { KindGlyph } from "@/components/kind-glyph";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import { useSettled } from "@/components/motion/use-settled";
import { loadPeekRecord } from "@/components/peek/peek-provider";
import { formatCountIn } from "@/lib/format";
import { NEWS_LANGUAGES, PUBLISHER_KINDS, type RecencyGroupKey } from "@/lib/news-meta";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
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
    { total: number; relevantTotal: number; items: NewsItemView[]; unloaded: NewsExplorerRow[] }
  >;
  /** Day archive pages that hold everything in this group. */
  days: NewsExplorerDay[];
};

type LanguageFilter = "all" | NewsLanguage;
type KindFilter = "all" | PublisherKind;
const ALL_PUBLISHERS = "__all__";

type EntityFilter = { id: string; label: string; href: string | null; kind: PeekKind | null };

/** What a filter needs to know about an item, whether it is loaded as a card or not. */
type Row = { kind: PublisherKind; publisher: string; language: NewsLanguage };

function countBy<K extends string>(rows: Row[], key: (row: Row) => K): Map<K, number> {
  const map = new Map<K, number>();
  for (const row of rows) map.set(key(row), (map.get(key(row)) ?? 0) + 1);
  return map;
}

const pill = (active: boolean) =>
  `inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-pill border px-3 text-sm font-medium transition-fast sm:min-h-8 ${
    active
      ? "border-accent/40 bg-accent-soft text-accent-text"
      : "border-line bg-surface-raised text-ink-muted hover:text-ink"
  }`;

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
  const [language, setLanguage] = useState<LanguageFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [publisher, setPublisher] = useState<string>(ALL_PUBLISHERS);
  const [entity, setEntity] = useState<EntityFilter | null>(null);
  const [showAll, setShowAll] = useState(false);
  const relevantOnly = !showAll;
  const selectId = useId();
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

  // ?entity=<id> from a peek popover: filter on one mentioned entity.
  useEffect(() => {
    const read = () => {
      const id = new URLSearchParams(window.location.search).get("entity");
      if (!id) {
        setEntity(null);
        return;
      }
      const mention = loaded.flatMap((item) => item.entities).find((entry) => entry.id === id);
      setEntity({ id, label: mention?.label ?? id, href: mention?.href ?? null, kind: mention?.peekKind ?? null });
      if (!mention) {
        loadPeekRecord(id)
          .then((record) => {
            if (record) setEntity({ id, label: record.name, href: record.href, kind: record.kind });
          })
          .catch(() => {});
      }
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [loaded]);

  const clearEntity = () => {
    setEntity(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("entity");
    window.history.replaceState(window.history.state, "", url.toString());
  };

  const sumTotals = (pick: (bucket: NewsExplorerGroup["languages"][NewsLanguage]) => number): Record<LanguageFilter, number> => ({
    all: groups.reduce((sum, group) => sum + pick(group.languages.nl) + pick(group.languages.en), 0),
    nl: groups.reduce((sum, group) => sum + pick(group.languages.nl), 0),
    en: groups.reduce((sum, group) => sum + pick(group.languages.en), 0),
  });
  const totals = sumTotals((bucket) => bucket.total);
  const relevantTotals = sumTotals((bucket) => bucket.relevantTotal);
  const shownTotals = relevantOnly ? relevantTotals : totals;

  // Every relevant item is a card; with "show all" the rest is counted from compact rows.
  const countUnloaded = showAll && entity === null;
  const cards = relevantOnly ? loaded.filter((item) => item.relevant) : loaded;
  const rowsOf = (group: NewsExplorerGroup): Row[] =>
    countUnloaded
      ? NEWS_LANGUAGES.flatMap((lang) =>
          group.languages[lang].unloaded.map(([rowKind, rowPublisher]) => ({ kind: rowKind, publisher: rowPublisher, language: lang })),
        )
      : [];
  const unloadedRows = groups.flatMap(rowsOf);
  const inLanguage = (row: Row) => language === "all" || row.language === language;
  const cardRows: Row[] = (entity ? cards.filter((item) => item.entities.some((entry) => entry.id === entity.id)) : cards).filter(inLanguage);
  const rows: Row[] = [...cardRows, ...unloadedRows.filter(inLanguage)];
  const kindCounts = countBy(rows, (row) => row.kind);
  const kindFiltered = kind === "all" ? rows : rows.filter((row) => row.kind === kind);
  const publisherCounts = countBy(kindFiltered, (row) => row.publisher);
  const publishers = [...publisherCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"));
  const activePublisher = publisherCounts.has(publisher) ? publisher : ALL_PUBLISHERS;
  const filtering = kind !== "all" || activePublisher !== ALL_PUBLISHERS || entity !== null;

  const matchesRow = (row: Row) =>
    inLanguage(row) &&
    (kind === "all" || row.kind === kind) &&
    (activePublisher === ALL_PUBLISHERS || row.publisher === activePublisher);
  const matches = (item: NewsItemView) =>
    matchesRow(item) && (entity === null || item.entities.some((entry) => entry.id === entity.id));

  const languageOptions: LanguageFilter[] = ["all", ...NEWS_LANGUAGES];

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

  return (
    <div data-settled={settled ? "" : undefined}>
      <p className="mb-3 text-xs text-ink-faint">
        <a href="/methodiek/#machinevertaling" className="underline decoration-line underline-offset-2 hover:text-ink">
          {messages.card.translationNote}
        </a>
      </p>
      <div role="group" aria-label={messages.filtersLabel} className="space-y-3">
        <div
          role="group"
          aria-label={messages.languageTabsLabel}
          className="scroll-row -mx-4 gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0 sm:[mask-image:none]"
        >
          <SlidingIndicator variant="ring" className="rounded-pill border border-accent/40" />
          {languageOptions.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={language === option}
              onClick={() => {
                setLanguage(option);
                setPublisher(ALL_PUBLISHERS);
              }}
              className={pill(language === option)}
            >
              {option === "all" ? messages.allLanguagesLabel : messages.languageFilterLabels[option]}
              <span className="ml-1.5 tabular-nums text-ink-faint">{formatCountIn(shownTotals[option], uiLanguage)}</span>
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label={messages.kindFilterLabel}
          className="scroll-row -mx-4 gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0 sm:[mask-image:none]"
        >
          <SlidingIndicator variant="ring" className="rounded-pill border border-accent/40" />
          {(["all", ...PUBLISHER_KINDS] as KindFilter[]).map((option) => {
            const count = option === "all" ? rows.length : (kindCounts.get(option) ?? 0);
            if (option !== "all" && count === 0) return null;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => setKind(option)}
                className={pill(kind === option)}
              >
                {option === "all" ? messages.allKindsLabel : messages.kindLabels[option]}
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
            value={activePublisher}
            onChange={(event) => setPublisher(event.target.value)}
            className="min-h-11 min-w-0 max-w-full flex-1 rounded-sm border border-line bg-surface-raised px-2 text-sm text-ink sm:min-h-9 sm:flex-none"
          >
            <option value={ALL_PUBLISHERS}>
              {messages.allPublishersLabel}
            </option>
            {publishers.map(([name]) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {entity !== null ? (
          <div className="rounded-md border border-line bg-surface-inset p-3 text-sm">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-ink-muted">{messages.entityFilterLabel}</span>
              <span lang="nl" className="inline-flex items-center gap-1.5 font-medium text-ink">
                {entity.kind ? <KindGlyph kind={entity.kind} /> : null}
                {entity.label}
              </span>
              <button
                type="button"
                onClick={clearEntity}
                className="ml-auto inline-flex min-h-11 items-center rounded-sm border border-line bg-surface px-3 text-sm font-medium text-ink-muted hover:text-ink sm:min-h-8"
              >
                {messages.entityFilterClear}
              </button>
            </p>
            {entity.href ? (
              <p className="mt-1 text-xs text-ink-faint">
                {rows.length === 0 ? `${messages.entityFilterEmpty} ` : null}
                <Link href={entity.href} className="text-accent-text underline-offset-2 hover:underline">
                  {interpolate(NEWS_DICT.newsEntityAllLink[uiLanguage], { name: entity.label })}
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

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
            <p role="status" className="text-sm text-ink-muted">
              {interpolate(NEWS_DICT.newsRelevantCount[uiLanguage], {
                n: formatCountIn(relevantTotals[language], uiLanguage),
                total: formatCountIn(totals[language], uiLanguage),
              })}
            </p>
            <button type="button" aria-pressed={showAll} onClick={() => setShowAll((value) => !value)} className={pill(showAll)}>
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
                            <li key={item.id} className="motion-enter">
                              <NewsItemCard item={item} displayLanguage={uiLanguage} />
                            </li>
                          ))}
                        </ol>
                        {hidden.length > 0 ? (
                          <MoreItems
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
 * reader opens it, so the page ships and paints the first ten per group, not hundreds.
 */
function MoreItems({
  items,
  language,
  showMore,
  showLess,
}: {
  items: NewsItemView[];
  language: NewsLanguage;
  showMore: string;
  showLess: string;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <details
      className="motion-disclosure group mt-3"
      onToggle={(event) => {
        if (event.currentTarget.open) setOpened(true);
      }}
    >
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-pill border border-line bg-surface-raised px-4 text-sm font-medium text-ink transition-fast hover:border-accent/40 hover:bg-accent-soft hover:text-accent-text sm:min-h-9 pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">{showMore}</span>
        <span className="hidden group-open:inline">{showLess}</span>
      </summary>
      {opened ? (
        <ol className="mt-3 list-none space-y-2 p-0">
          {items.map((item) => (
            <li key={item.id} className="motion-enter">
              <NewsItemCard item={item} displayLanguage={language} />
            </li>
          ))}
        </ol>
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
              className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-line bg-surface-raised px-3 text-sm text-ink-muted transition-fast hover:border-accent/40 hover:text-accent-text sm:min-h-9"
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
              className="inline-flex min-h-11 items-center rounded-pill px-3 text-sm font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline sm:min-h-9"
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
