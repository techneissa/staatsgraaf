"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NewsFilterBar, pillClass } from "./news-filter-bar";
import { NEWS_GRID_CLASS } from "./news-grid";
import { NewsItemCard } from "./news-item-card";
import type { NewsItemView } from "./news-view";
import { useNewsFilters } from "./use-news-filters";
import { NEWS_WINDOW_STEP, ShowMoreButton } from "./windowed-cards";
import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/components/i18n/language-provider";
import { formatCountIn } from "@/lib/format";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { interpolate } from "@/lib/i18n/locales";
import { newsFacets, rowMatches } from "@/lib/news-facets";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { readEntryState, writeEntryState } from "@/lib/news-entry-state";
import { windowHours } from "@/lib/news-stats";
import type { NewsLanguage } from "@/lib/types";

export type NewsDayHour = { hour: string; label: string; items: NewsItemView[] };
export type NewsDayNavLink = { date: string; label: string };

/** Previous and next day, and the way back to the list of all days. */
function DayNav({
  previous,
  next,
  archiveBase,
  lang,
}: {
  previous: NewsDayNavLink | null;
  next: NewsDayNavLink | null;
  archiveBase: string;
  lang: NewsLanguage;
}) {
  const linkClass =
    "inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-line bg-surface-raised px-4 text-sm font-medium text-ink-muted transition-fast hover:border-accent/40 hover:text-accent-text";
  return (
    <nav aria-label={NEWS_DICT.newsAllDays[lang]} className="flex flex-wrap items-center justify-between gap-2 py-4">
      {previous !== null ? (
        <Link href={`${archiveBase}/${previous.date}/`} rel="prev" className={linkClass}>
          <span aria-hidden="true">&lsaquo;</span>
          <span>
            {NEWS_DICT.newsPrevDay[lang]}
            <span className="ms-1.5 font-normal text-ink-faint">{previous.label}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      <Link href={`${archiveBase}/#eerdere-dagen`} className="text-sm text-accent-text underline-offset-2 hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center">
        {NEWS_DICT.newsAllDays[lang]}
      </Link>
      {next !== null ? (
        <Link href={`${archiveBase}/${next.date}/`} rel="next" className={linkClass}>
          <span>
            {NEWS_DICT.newsNextDay[lang]}
            <span className="ms-1.5 font-normal text-ink-faint">{next.label}</span>
          </span>
          <span aria-hidden="true">&rsaquo;</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/**
 * The hour sections of a day archive, with the same controls as the main list: original
 * language, kind and outlet, and the "show all news" toggle (docs/adr/0021). A busy day
 * holds hundreds of items, so the cards come in windows of `NEWS_WINDOW_STEP` with a
 * "show more" button (NW-19). `fixedLanguage` pins the interface language of the route.
 */
export function NewsDayList({
  hours,
  total,
  relevantTotal,
  fixedLanguage,
  previous,
  next,
  archiveBase,
}: {
  hours: NewsDayHour[];
  total: number;
  relevantTotal: number;
  fixedLanguage?: NewsLanguage;
  previous: NewsDayNavLink | null;
  next: NewsDayNavLink | null;
  /** "/nieuws" or "/news". */
  archiveBase: string;
}) {
  const siteLocale = useLocale();
  const lang: NewsLanguage = fixedLanguage ?? siteLocale;
  const messages = NEWS_MESSAGES[lang];
  const { filters, update, ready } = useNewsFilters();
  const showAll = filters.showAll;

  const dayNav = <DayNav previous={previous} next={next} archiveBase={archiveBase} lang={lang} />;

  // The window restarts at one page whenever the filters change, and Back brings it back.
  const signature = `${filters.language}|${filters.kind}|${filters.publisher ?? ""}|${showAll ? 1 : 0}`;
  const [windowState, setWindowState] = useState({ signature: "", shown: NEWS_WINDOW_STEP });
  const shown = windowState.signature === signature ? windowState.shown : NEWS_WINDOW_STEP;
  useEffect(() => {
    if (!ready) return;
    const entry = readEntryState();
    if (entry.daySignature === signature && typeof entry.dayShown === "number") {
      setWindowState({ signature, shown: Math.max(NEWS_WINDOW_STEP, entry.dayShown) });
    }
  }, [ready, signature]);

  const pool = hours.map((hour) => ({ ...hour, items: showAll ? hour.items : hour.items.filter((item) => item.relevant) }));
  const poolItems = pool.flatMap((hour) => hour.items);
  const { languageRows, kindCounts, publishers, activePublisher } = newsFacets(poolItems, filters);
  const languageCounts = {
    all: poolItems.length,
    nl: poolItems.filter((item) => item.language === "nl").length,
    en: poolItems.filter((item) => item.language === "en").length,
  };
  const filtering = filters.kind !== "all" || activePublisher !== null;
  useEffect(() => {
    if (ready && filters.publisher !== null && activePublisher === null) update({ publisher: null });
  }, [ready, filters.publisher, activePublisher, update]);

  if (total === 0) {
    return (
      <>
        <section className="py-6">
          <EmptyState title={NEWS_DICT.newsDayEmpty[lang]} />
        </section>
        {dayNav}
      </>
    );
  }

  const sections = pool
    .map((hour) => ({ ...hour, items: hour.items.filter((item) => rowMatches(item, filters, activePublisher)) }))
    .filter((hour) => hour.items.length > 0);
  const windowed = windowHours(sections, shown);
  const countWord = (count: number) =>
    interpolate(count === 1 ? NEWS_DICT.newsFilterCountWordOne[lang] : NEWS_DICT.newsFilterCountWord[lang], {
      n: formatCountIn(count, lang),
    });
  const matched = windowed.total;
  // The machine-translation line counts what is listed (NW-12): items in the other language, and how many are translated.
  const foreign = poolItems.filter((item) => item.language !== lang && (filters.language === "all" || filters.language === item.language));
  const translatedCount = foreign.filter((item) => item.translation !== null && item.translation.language === lang).length;
  const poolFiltered = filters.language !== "all" || filtering;

  return (
    <>
      <div className="space-y-3 border-b border-line py-4">
        <p className="text-xs text-ink-faint">
          {foreign.length > 0 ? (
            <>
              {interpolate(NEWS_DICT.newsTranslatedCount[lang], {
                translated: formatCountIn(translatedCount, lang),
                total: formatCountIn(foreign.length, lang),
              })}{" "}
            </>
          ) : null}
          <a href="/methodiek/#machinevertaling" className="underline decoration-line underline-offset-2 hover:text-ink">
            {foreign.length > 0 ? NEWS_DICT.newsTranslatedMethodLink[lang] : messages.card.translationNote}
          </a>
        </p>
        <NewsFilterBar
          uiLanguage={lang}
          filters={filters}
          update={update}
          languageCounts={languageCounts}
          kindCounts={kindCounts}
          rowCount={languageRows.length}
          publishers={publishers}
          activePublisher={activePublisher}
        />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p role="status" aria-atomic="true" className="text-sm text-ink-muted">
            {interpolate(NEWS_DICT.newsRelevantCount[lang], {
              n: formatCountIn(relevantTotal, lang),
              total: formatCountIn(total, lang),
            })}
            {poolFiltered
              ? ` \u00b7 ${matched === 0 ? messages.noItemsFilterLabel : interpolate(NEWS_DICT.newsFilterResultCount[lang], { n: countWord(matched) })}`
              : ""}
          </p>
          <button type="button" aria-pressed={showAll} onClick={() => update({ showAll: !showAll })} className={pillClass(showAll)}>
            {NEWS_DICT.newsShowAll[lang]}
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <section className="py-6">
          {poolFiltered ? (
            <EmptyState title={messages.noItemsFilterLabel} />
          ) : (
            <EmptyState
              title={NEWS_DICT.newsRelevantEmptyTitle[lang]}
              description={NEWS_DICT.newsRelevantEmptyDescription[lang]}
            />
          )}
        </section>
      ) : (
        <>
          {windowed.hours.map((hour) => (
            <section key={hour.hour} aria-labelledby={`uur-${hour.hour}`} className="border-b border-line py-6">
              <h2 id={`uur-${hour.hour}`} className="text-lg font-semibold tracking-tight text-ink">
                {hour.label}
              </h2>
              <ol className={`mt-3 ${NEWS_GRID_CLASS}`}>
                {hour.items.map((item) => (
                  <li key={item.id}>
                    <NewsItemCard item={item} displayLanguage={fixedLanguage} />
                  </li>
                ))}
              </ol>
            </section>
          ))}
          <div className="py-4">
            <p className="text-sm text-ink-muted">
              {interpolate(NEWS_DICT.newsDayShown[lang], {
                shown: formatCountIn(windowed.shown, lang),
                total: formatCountIn(windowed.total, lang),
              })}
            </p>
            {windowed.rest > 0 ? (
              <ShowMoreButton
                label={interpolate(NEWS_DICT.newsDayMore[lang], { n: formatCountIn(Math.min(windowed.rest, NEWS_WINDOW_STEP), lang) })}
                onClick={() => {
                  const value = shown + NEWS_WINDOW_STEP;
                  setWindowState({ signature, shown: value });
                  writeEntryState({ daySignature: signature, dayShown: value });
                }}
              />
            ) : null}
          </div>
        </>
      )}
      {dayNav}
    </>
  );
}
