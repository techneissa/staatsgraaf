import { DateStamp } from "./date-stamp";
import { EntityChip } from "./entity-chip";
import { SourceLink } from "./source-link";
import { entitySummary, getSourceById } from "@/lib/data";
import { renderSummaryMarkup } from "@/lib/markup";
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
  const entityChips = item.entities
    .map((id) => entitySummary(id))
    .filter((entry): entry is { href: string; label: string } => entry !== null);

  return (
    <Tag className="rounded-md border border-line bg-surface p-4">
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
      {entityChips.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {entityChips.map((entry) => (
            <li key={entry.href}>
              <EntityChip href={entry.href}>{entry.label}</EntityChip>
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
    </Tag>
  );
}
