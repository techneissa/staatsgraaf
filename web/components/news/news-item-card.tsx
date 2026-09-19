import { EntityChip } from "@/components/entity-chip";
import { KindBadge } from "@/components/kind-badge";
import { renderSummaryMarkupWithHrefs } from "@/lib/news-summary";
import { clampMarkupSentences, clampSentences } from "@/lib/news-text";
import type { NewsMessages } from "@/lib/news-i18n";
import { NewsPreviewTile } from "./news-preview";
import { stripPublisherPrefix, stripTitleFromMarkup } from "@/lib/news-text";
import type { NewsItemView } from "./news-view";

/**
 * One news item, in the reference-product style: strong linked title, a date
 * line under it, a short muted summary, source pill with the outlet host at the
 * bottom left, and the preview tile on the right. Pure: it renders a resolved
 * view and reads no data, so it works inside the client explorer and on
 * server-rendered archive pages alike.
 * The source link is always rendered; no filter or disclosure removes it.
 */
export function NewsItemCard({
  item,
  messages,
  showDate = true,
}: {
  item: NewsItemView;
  messages: NewsMessages;
  showDate?: boolean;
}) {
  const keywordText = item.keywords.length > 0 ? item.keywords.join(", ") : null;
  const summaryMarkup = stripTitleFromMarkup(item.summaryMarkup, item.title);
  const useMarkup = summaryMarkup !== null;
  const plainSummary = stripPublisherPrefix(item.summary, item.title);

  return (
    <article
      className="group rounded-md border border-line bg-surface p-4 transition-fast hover:border-line-strong"
      aria-labelledby={`${item.id}-kop`}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 id={`${item.id}-kop`} className="text-[15px] font-semibold leading-snug" lang={item.language}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink decoration-accent decoration-2 underline-offset-2 transition-fast hover:text-accent-text hover:underline"
            >
              {item.title}
              <span className="sr-only"> {messages.card.opensNewTab}</span>
            </a>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
            {showDate ? (
              <time dateTime={item.published} className="tabular-nums">
                {item.dateTime}
              </time>
            ) : (
              <time dateTime={item.published} className="tabular-nums">
                {item.time}
              </time>
            )}
            {item.language === "en" ? (
              <span
                lang="en"
                className="rounded-pill border border-line px-1.5 text-[10px] font-medium uppercase tracking-wide"
              >
                EN
              </span>
            ) : null}
            <KindBadge>{item.kindLabel}</KindBadge>
          </div>
          {useMarkup ? (
            <p
              className="mt-2 text-sm leading-normal text-ink-muted"
              lang={item.language}
            >
              {renderSummaryMarkupWithHrefs(clampMarkupSentences(summaryMarkup as string), (id) => item.entities.find((entry) => entry.id === id)?.href ?? null)}
            </p>
          ) : plainSummary !== "" ? (
            <p
              className="mt-2 text-sm leading-normal text-ink-muted"
              lang={item.language}
            >
              {clampSentences(plainSummary)}
            </p>
          ) : null}
          {item.entities.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={messages.card.mentionedInLabel}>
              {item.entities.map((entry) => (
                <li key={entry.id}>
                  <EntityChip
                    href={entry.href}
                    meta={messages.card.entityKindLabels[entry.kind]}
                    icon={
                      entry.portrait !== null ? (
                        <img
                          src={entry.portrait.url}
                          alt=""
                          title={entry.portrait.caption}
                          width={24}
                          height={24}
                          loading="lazy"
                          decoding="async"
                          className="h-6 w-6 rounded-pill border border-line object-cover"
                        />
                      ) : undefined
                    }
                  >
                    {entry.label}
                  </EntityChip>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <NewsPreviewTile preview={item.preview} rounded="lg" responsive />
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-ink-faint">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-pill border border-line bg-surface-inset py-1 px-2.5 text-[11px] font-medium tracking-wide text-ink-muted transition-fast hover:border-line-strong hover:text-accent-text"
        >
          {item.host}
          <SourceArrow />
          <span className="sr-only"> {messages.card.opensNewTab}</span>
        </a>
        {keywordText !== null ? (
          <span title={`${messages.card.linkedOnLabel} ${keywordText}`}>
            {messages.card.linkedOnLabel} {keywordText}
          </span>
        ) : null}
      </p>
    </article>
  );
}

export function SourceArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="10" height="10" className="shrink-0">
      <path
        d="M6 14 14 6M8 6h6v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
