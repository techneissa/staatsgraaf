"use client";

import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { NewsItemCard } from "./news-item-card";
import type { NewsItemView } from "./news-view";
import { EmptyState } from "@/components/empty-state";
import { formatCount } from "@/lib/format";
import { NEWS_LANGUAGES, PUBLISHER_KINDS, type RecencyGroupKey } from "@/lib/news-meta";
import type { NewsMessages } from "@/lib/news-i18n";
import type { NewsLanguage, PublisherKind } from "@/lib/types";

export type NewsExplorerDay = {
  date: string;
  label: string;
  count: number;
};

export type NewsExplorerGroup = {
  key: RecencyGroupKey;
  label: string;
  /** Per language: the true total in the dataset and the capped, newest-first items loaded on this page. */
  languages: Record<NewsLanguage, { total: number; items: NewsItemView[] }>;
  /** Day archive pages that hold everything in this group. */
  days: NewsExplorerDay[];
};

type KindFilter = "all" | PublisherKind;
const ALL_PUBLISHERS = "__all__";

const tabTriggerClass =
  "rounded-xs px-3 py-1.5 text-sm font-medium text-ink-muted transition-fast hover:text-ink data-[state=active]:bg-accent-soft data-[state=active]:text-accent-text";

function countBy<K extends string>(items: NewsItemView[], key: (item: NewsItemView) => K): Map<K, number> {
  const map = new Map<K, number>();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return map;
}

export function NewsExplorer({
  groups,
  initialVisible,
  messages,
  initialLanguage,
  archiveBase,
}: {
  groups: NewsExplorerGroup[];
  initialVisible: number;
  messages: NewsMessages;
  initialLanguage: NewsLanguage;
  /** Path prefix for day archive links, for example "/nieuws" or "/news". */
  archiveBase: string;
}) {
  const [language, setLanguage] = useState<NewsLanguage>(initialLanguage);
  const [kind, setKind] = useState<KindFilter>("all");
  const [publisher, setPublisher] = useState<string>(ALL_PUBLISHERS);
  const selectId = useId();

  const loaded = useMemo(
    () =>
      Object.fromEntries(
        NEWS_LANGUAGES.map((lang) => [lang, groups.flatMap((group) => group.languages[lang].items)]),
      ) as Record<NewsLanguage, NewsItemView[]>,
    [groups],
  );
  const totals = Object.fromEntries(
    NEWS_LANGUAGES.map((lang) => [
      lang,
      groups.reduce((sum, group) => sum + group.languages[lang].total, 0),
    ]),
  ) as Record<NewsLanguage, number>;

  return (
    <Tabs.Root
      value={language}
      onValueChange={(value) => {
        setLanguage(value === "en" ? "en" : "nl");
        setPublisher(ALL_PUBLISHERS);
      }}
    >
      <Tabs.List
        aria-label={messages.languageTabsLabel}
        className="inline-flex gap-1 rounded-sm border border-line bg-surface-inset p-1"
      >
        {NEWS_LANGUAGES.map((lang) => (
          <Tabs.Trigger key={lang} value={lang} className={tabTriggerClass}>
            {messages.languageLabels[lang]}
            <span className="ml-1.5 tabular-nums text-ink-faint">{formatCount(totals[lang])}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <noscript>
        <p className="mt-3 text-xs text-ink-faint">{messages.noscript}</p>
      </noscript>

      {NEWS_LANGUAGES.map((lang) => {
        const items = loaded[lang];
        const kindCounts = countBy(items, (item) => item.kind);
        const kindFiltered = kind === "all" ? items : items.filter((item) => item.kind === kind);
        const publisherCounts = countBy(kindFiltered, (item) => item.publisher);
        const publishers = [...publisherCounts.entries()].sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"),
        );
        const activePublisher = publisherCounts.has(publisher) ? publisher : ALL_PUBLISHERS;
        const matches = (item: NewsItemView) =>
          (kind === "all" || item.kind === kind) &&
          (activePublisher === ALL_PUBLISHERS || item.publisher === activePublisher);

        return (
          <Tabs.Content
            key={lang}
            value={lang}
            className="mt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {totals[lang] === 0 ? (
              <EmptyState
                title={messages.emptyByLanguage[lang].title}
                description={messages.emptyByLanguage[lang].description}
              />
            ) : (
              <>
                <div
                  role="group"
                  aria-label={messages.kindFilterLabel}
                  className="flex flex-wrap gap-2"
                >
                  {(["all", ...PUBLISHER_KINDS] as KindFilter[]).map((option) => {
                    const count = option === "all" ? items.length : (kindCounts.get(option) ?? 0);
                    if (option !== "all" && count === 0) return null;
                    const active = kind === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={active}
                        aria-current={active ? "true" : undefined}
                        onClick={() => setKind(option)}
                        className={`rounded-pill border px-3 py-1 text-sm font-medium transition-fast ${
                          active
                            ? "border-accent/40 bg-accent-soft text-accent-text"
                            : "border-line bg-surface-raised text-ink-muted hover:text-ink"
                        }`}
                      >
                        {option === "all" ? messages.allKindsLabel : messages.kindLabels[option]}
                        <span className="ml-1.5 tabular-nums text-ink-faint">{formatCount(count)}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <label htmlFor={`${selectId}-${lang}`} className="font-medium text-ink-muted">
                    {messages.publisherSelectLabel}
                  </label>
                  <select
                    id={`${selectId}-${lang}`}
                    value={activePublisher}
                    onChange={(event) => setPublisher(event.target.value)}
                    className="rounded-sm border border-line bg-surface-raised px-2 py-1.5 text-sm text-ink"
                  >
                    <option value={ALL_PUBLISHERS}>
                      {messages.allPublishersLabel} ({formatCount(kindFiltered.length)})
                    </option>
                    {publishers.map(([name, count]) => (
                      <option key={name} value={name}>
                        {name} ({formatCount(count)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 space-y-8">
                  {groups.map((group) => {
                    const bucket = group.languages[lang];
                    const filtered = bucket.items.filter(matches);
                    const visible = filtered.slice(0, initialVisible);
                    const hidden = filtered.slice(initialVisible);
                    const truncated = bucket.total > bucket.items.length;
                    const headingId = `groep-${lang}-${group.key}`;
                    return (
                      <section key={group.key} aria-labelledby={headingId}>
                        <div className="sticky top-0 z-10 -mx-4 flex items-baseline justify-between gap-2 border-b border-line bg-canvas px-4 py-2">
                          <h3 id={headingId} className="text-sm font-semibold uppercase tracking-wider text-ink-faint">
                            {messages.groupLabels[group.key]}
                          </h3>
                          <span className="text-xs tabular-nums text-ink-faint">
                            {kind === "all" && activePublisher === ALL_PUBLISHERS && truncated
                              ? `${formatCount(bucket.items.length)} ${messages.ofWord} ${formatCount(bucket.total)}`
                              : formatCount(filtered.length)}{" "}
                            {filtered.length === 1
                              ? messages.itemsWordSingular
                              : messages.itemsWordPlural}
                          </span>
                        </div>

                        {truncated ? (
                          <p className="mt-2 text-xs text-ink-faint">
                            {messages.truncatedIntro} {formatCount(bucket.items.length)}{" "}
                            {messages.ofWord} {formatCount(bucket.total)}{" "}
                            {bucket.total === 1 ? messages.itemsWordSingular : messages.itemsWordPlural}
                            . {messages.allPerDay}{" "}
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
                            {bucket.items.length === 0
                              ? messages.noItemsLabel
                              : messages.noItemsFilterLabel}
                          </p>
                        ) : (
                          <>
                            <ol className="mt-3 list-none space-y-2 p-0">
                              {visible.map((item) => (
                                <li key={item.id}>
                                  <NewsItemCard item={item} messages={messages} />
                                </li>
                              ))}
                            </ol>
                            {hidden.length > 0 ? (
                              <details className="group mt-3">
                                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-pill border border-line bg-surface-raised px-4 py-2 text-sm font-medium text-ink transition-fast hover:border-accent/40 hover:bg-accent-soft hover:text-accent-text [&::-webkit-details-marker]:hidden">
                                  <span className="group-open:hidden">
                                    {messages.showMoreLabel} ({formatCount(hidden.length)})
                                  </span>
                                  <span className="hidden group-open:inline">
                                    {messages.showLessLabel}
                                  </span>
                                </summary>
                                <ol className="mt-3 list-none space-y-2 p-0">
                                  {hidden.map((item) => (
                                    <li key={item.id}>
                                      <NewsItemCard item={item} messages={messages} />
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
              </>
            )}
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
}
