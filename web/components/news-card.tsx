import { DateStamp } from "./date-stamp";
import { EntityChip } from "./entity-chip";
import { T } from "./i18n/t";
import { LabeledList } from "./news/labeled-list";
import { SourceLink } from "./source-link";
import { SourceRankLink } from "./news/source-rank-link";
import { SourceArrow } from "./news/news-item-card";
import { NewsPreviewTile } from "./news/news-preview";
import { resolveNewsPreview, hostLabel } from "./news/news-view";
import { clampMarkupSentences, clampSentences, stripPublisherPrefix, stripTitleFromMarkup, summaryIsPublisherEcho } from "@/lib/news-text";
import { getSourceById } from "@/lib/data";
import { getMediaItem, mediaCreditLine } from "@/lib/entity";
import { renderSummaryMarkup } from "@/lib/markup";
import { newsKind, resolveNewsEntities } from "@/lib/news";
import type { NewsItem, Source } from "@/lib/types";

export type NewsCardSource = {
  index: number;
  source: Source;
};

export function getCardSources(item: NewsItem): NewsCardSource[] {
  const result: NewsCardSource[] = [];
  item.sources.forEach((ref, index) => {
    if (ref === undefined) return;
    const source = getSourceById(ref.source);
    if (source) result.push({ index: index + 1, source });
  });
  return result;
}

/**
 * The preview image of an item, shared shape with news-view: a licensed media
 * record when the pipeline stored one, otherwise the feed-supplied image URL
 * as a remote preview credited to the outlet (adr/0008).
 */
function previewImage(item: NewsItem): { url: string; caption: string; remote: boolean } | null {
  const media = getMediaItem(item.image);
  if (media !== null) return { url: media.url, caption: mediaCreditLine(media), remote: false };
  if (typeof item.imageUrl === "string" && item.imageUrl !== "") {
    return { url: item.imageUrl, caption: item.publisher, remote: true };
  }
  return null;
}

/**
 * The server-rendered news card used on the home page, topic pages, and entity
 * pages. It shares the preview tile and the entity chips with the news section
 * card, so a portrait or credit looks the same everywhere.
 */
export function NewsCard({
  item,
  rank,
  as: Tag = "article",
}: {
  item: NewsItem;
  rank?: number;
  as?: "article" | "li" | "div";
}) {
  const sources = getCardSources(item);
  const primary = sources[0];
  const entities = resolveNewsEntities(item);
  const preview = resolveNewsPreview({
    image: previewImage(item),
    entities,
    publisher: item.publisher,
    publisherKind: newsKind(item),
  });
  const summaryMarkup = stripTitleFromMarkup(item.summaryMarkup, item.title);
  const useMarkup = summaryMarkup !== null;
  const plainSummary = stripPublisherPrefix(item.summary, item.title);
  const showPlainSummary = !useMarkup && plainSummary !== "";

  return (
    <Tag className="group rounded-md border border-line bg-surface p-4 transition-fast hover:border-line-strong">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink decoration-accent decoration-2 underline-offset-2 transition-fast hover:text-accent-text hover:underline"
            >
              {item.title}
              <span className="sr-only"> <T area="news" k="cardOpensNewTab" /></span>
            </a>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <DateStamp date={item.published} />
            {item.language === "en" ? (
              <span
                lang="en"
                className="rounded-pill border border-line px-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint"
              >
                EN
              </span>
            ) : null}
          </div>
          {useMarkup ? (
            <p className="mt-2 text-sm leading-normal text-ink-muted">
              {renderSummaryMarkup(clampMarkupSentences(summaryMarkup as string))}
            </p>
          ) : showPlainSummary ? (
            <p className="mt-2 text-sm leading-normal text-ink-muted">{clampSentences(plainSummary)}</p>
          ) : null}
          {entities.length > 0 ? (
            <LabeledList labelKey="cardMentionedLabel" className="mt-3 flex flex-wrap gap-2">
              {entities.map((entry) => (
                <li key={entry.id}>
                  <EntityChip
                    href={entry.href}
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
            </LabeledList>
          ) : null}
        </div>
        <NewsPreviewTile preview={preview} rounded="lg" responsive />
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-ink-faint">
        <span className="flex items-center gap-2">
          {rank !== undefined && primary !== undefined ? (
            <SourceRankLink href={primary.source.url} rank={rank}>
              [{rank}]
            </SourceRankLink>
          ) : rank !== undefined ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="tabular-nums font-medium text-accent-text underline-offset-2 hover:underline"
            >
              [{rank}]
            </a>
          ) : null}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-pill border border-line bg-surface-inset py-1 px-2.5 text-[11px] font-medium tracking-wide text-ink-muted transition-fast hover:border-line-strong hover:text-accent-text"
          >
            {hostLabel(item.url)}
            <SourceArrow />
            <span className="sr-only"> <T area="news" k="cardOpensNewTab" /></span>
          </a>
        </span>
      </p>
      {sources.length > 0 ? (
        <ol className="mt-3 space-y-1 border-t border-line pt-2">
          {sources.map(({ index, source }) => (
            <li key={source.id} className="flex items-baseline gap-1.5 text-xs leading-snug">
              <span className="shrink-0 tabular-nums text-ink-faint">[{index}]</span>
              <SourceLink href={source.url} meta={source.publisher} className="min-w-0 text-xs">
                {source.title}
              </SourceLink>
            </li>
          ))}
        </ol>
      ) : null}
    </Tag>
  );
}
