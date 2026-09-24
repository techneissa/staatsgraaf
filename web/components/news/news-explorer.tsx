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
import { formatCount } from "@/lib/format";
import { NEWS_LANGUAGES, PUBLISHER_KINDS, type RecencyGroupKey } from "@/lib/news-meta";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import type { PeekKind } from "@/lib/peek";
import type { NewsLanguage, PublisherKind } from "@/lib/types";

export type NewsExplorerDay = {
  date: string;
  label: string;
  count: number;
};

export type NewsExplorerGroup = {
  key: RecencyGroupKey;
  label: string;
  /** Per original language: the true total in the dataset and the capped, newest-first items loaded on this page. */
  languages: Record<NewsLanguage, { total: number; items: NewsItemView[] }>;
  /** Day archive pages that hold everything in this group. */
  days: NewsExplorerDay[];
};

type LanguageFilter = "all" | NewsLanguage;
type KindFilter = "all" | PublisherKind;
const ALL_PUBLISHERS = "__all__";

type EntityFilter = { id: string; label: string; href: string | null; kind: PeekKind | null };

function countBy<K extends string>(items: NewsItemView[], key: (item: NewsItemView) => K): Map<K, number> {
  const map = new Map<K, number>();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return map;
}

const pill = (active: boolean) =>
  `inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-pill border px-3 text-sm font-medium transition-fast sm:min-h-8 ${
    active
      ? "border-accent/40 bg-accent-soft text-accent-text"
      : "border-line bg-surface-raised text-ink-muted hover:text-ink"
  }`;

/**
 * The news section: every item in every original language by default, shown
 * in the interface language with machine translations where they exist
 * (docs/adr/0016). Filters: original language, outlet kind, outlet, and, from
 * a peek popover's news link, one mentioned entity (`?entity=<id>`).
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

  const totals: Record<LanguageFilter, number> = {
    all: groups.reduce((sum, group) => sum + group.languages.nl.total + group.languages.en.total, 0),
    nl: groups.reduce((sum, group) => sum + group.languages.nl.total, 0),
    en: groups.reduce((sum, group) => sum + group.languages.en.total, 0),
  };

  const byLanguage = language === "all" ? loaded : loaded.filter((item) => item.language === language);
  const byEntity = entity ? byLanguage.filter((item) => item.entities.some((entry) => entry.id === entity.id)) : byLanguage;
  const kindCounts = countBy(byEntity, (item) => item.kind);
  const kindFiltered = kind === "all" ? byEntity : byEntity.filter((item) => item.kind === kind);
  const publisherCounts = countBy(kindFiltered, (item) => item.publisher);
  const publishers = [...publisherCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"));
  const activePublisher = publisherCounts.has(publisher) ? publisher : ALL_PUBLISHERS;
  const filtering = kind !== "all" || activePublisher !== ALL_PUBLISHERS || entity !== null;

  const matches = (item: NewsItemView) =>
    (language === "all" || item.language === language) &&
    (entity === null || item.entities.some((entry) => entry.id === entity.id)) &&
    (kind === "all" || item.kind === kind) &&
    (activePublisher === ALL_PUBLISHERS || item.publisher === activePublisher);

  const languageOptions: LanguageFilter[] = ["all", ...NEWS_LANGUAGES];

  return (
    <div data-settled={settled ? "" : undefined}>
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
              <span className="ml-1.5 tabular-nums text-ink-faint">{formatCount(totals[option])}</span>
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
            const count = option === "all" ? byEntity.length : (kindCounts.get(option) ?? 0);
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
                {byEntity.length === 0 ? `${messages.entityFilterEmpty} ` : null}
                {messages.entityFilterNote}{" "}
                <Link href={entity.href} lang="nl" className="text-accent-text underline-offset-2 hover:underline">
                  {entity.label}
                </Link>
                .
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
        <div className="mt-6 space-y-8">
          {merged.map(({ group }) => {
            const bucketItems =
              language === "all"
                ? merged.find((entry) => entry.group === group)?.items ?? []
                : group.languages[language].items;
            const bucketTotal =
              language === "all" ? group.languages.nl.total + group.languages.en.total : group.languages[language].total;
            const filtered = bucketItems.filter(matches);
            if (bucketItems.length === 0 || (entity !== null && filtered.length === 0)) return null;
            const visible = filtered.slice(0, initialVisible);
            const hidden = filtered.slice(initialVisible);
            const truncated = bucketTotal > bucketItems.length;
            const headingId = `groep-${group.key}`;
            return (
              <section key={group.key} aria-labelledby={headingId}>
                <div className="sticky top-0 z-10 -mx-4 flex items-baseline justify-between gap-2 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur-sm">
                  <h3 id={headingId} className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    {messages.groupLabels[group.key]}
                  </h3>
                  <span className="text-xs tabular-nums text-ink-faint">
                    {!filtering && truncated
                      ? `${formatCount(bucketItems.length)} ${messages.ofWord} ${formatCount(bucketTotal)}`
                      : formatCount(filtered.length)}{" "}
                    {filtered.length === 1 ? messages.itemsWordSingular : messages.itemsWordPlural}
                  </span>
                </div>

                {truncated && entity === null ? (
                  <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                    {messages.truncatedIntro} {formatCount(bucketItems.length)} {messages.ofWord}{" "}
                    {formatCount(bucketTotal)} {bucketTotal === 1 ? messages.itemsWordSingular : messages.itemsWordPlural}.{" "}
                    {messages.allPerDay}{" "}
                    {group.days.map((day, index) => (
                      <span key={day.date}>
                        {index > 0 ? ", " : null}
                        <Link
                          href={`${archiveBase}/${day.date}/`}
                          className="text-accent-text underline-offset-2 hover:underline"
                        >
                          {day.label} ({formatCount(day.count)})
                        </Link>
                      </span>
                    ))}
                    .
                  </p>
                ) : null}

                {filtered.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-faint">
                    {bucketItems.length === 0 ? messages.noItemsLabel : messages.noItemsFilterLabel}
                  </p>
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
                      <details className="motion-disclosure group mt-3">
                        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-pill border border-line bg-surface-raised px-4 text-sm font-medium text-ink transition-fast hover:border-accent/40 hover:bg-accent-soft hover:text-accent-text sm:min-h-9 [&::-webkit-details-marker]:hidden">
                          <span className="group-open:hidden">
                            {messages.showMoreLabel} ({formatCount(hidden.length)})
                          </span>
                          <span className="hidden group-open:inline">{messages.showLessLabel}</span>
                        </summary>
                        <ol className="mt-3 list-none space-y-2 p-0">
                          {hidden.map((item) => (
                            <li key={item.id} className="motion-enter">
                              <NewsItemCard item={item} displayLanguage={uiLanguage} />
                            </li>
                          ))}
                        </ol>
                      </details>
                    ) : null}
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
