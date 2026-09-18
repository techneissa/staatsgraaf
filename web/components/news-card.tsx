import { DateStamp } from "./date-stamp";
import { EntityChip } from "./entity-chip";
import { SourceLink } from "./source-link";
import { NewsPreviewTile, newsPreviewCaption } from "./news/news-preview";
import { resolveNewsPreview } from "./news/news-view";
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

function licensedImage(item: NewsItem): { url: string; caption: string } | null {
  const media = getMediaItem(item.image);
  return media === null ? null : { url: media.url, caption: mediaCreditLine(media) };
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
    image: licensedImage(item),
    entities,
    publisher: item.publisher,
    publisherKind: newsKind(item),
  });
  const caption = newsPreviewCaption(preview);

  return (
    <Tag className="rounded-md border border-line bg-surface p-4">
      <div className="flex gap-4">
        <NewsPreviewTile preview={preview} size={56} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs text-ink-faint">
              {rank !== undefined ? (
                <a
                  href={primary?.source.url ?? item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Bron ${rank} voor dit bericht`}
                  className="tabular-nums font-medium text-accent-text underline-offset-2 hover:underline"
                >
                  [{rank}]
                </a>
              ) : null}
              <span>{item.publisher}</span>
            </span>
            <DateStamp date={item.published} />
          </div>
          <h3 className="mt-1.5 text-sm font-semibold">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
            >
              {item.title}
              <span className="sr-only"> (opent in een nieuw tabblad)</span>
            </a>
          </h3>
          {item.summaryMarkup !== null ? (
            <p className="mt-2 text-sm leading-normal text-ink-muted">
              {renderSummaryMarkup(item.summaryMarkup)}
            </p>
          ) : item.summary !== null ? (
            <p className="mt-2 text-sm leading-normal text-ink-muted">{item.summary}</p>
          ) : null}
        </div>
      </div>
      {entities.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Genoemd in dit bericht">
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
        </ul>
      ) : null}
      {sources.length > 0 ? (
        <ol className="mt-3 space-y-1">
          {sources.map(({ index, source }) => (
            <li key={source.id} className="text-xs">
              <span className="mr-1 tabular-nums text-ink-faint">[{index}]</span>
              <SourceLink href={source.url} meta={source.publisher}>
                {source.title}
              </SourceLink>
            </li>
          ))}
        </ol>
      ) : null}
      {caption !== null ? (
        <p className="mt-2 text-[10px] leading-tight text-ink-faint">Beeld: {caption}</p>
      ) : null}
    </Tag>
  );
}
