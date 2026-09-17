import { DateStamp } from "./date-stamp";
import { EntityChip } from "./entity-chip";
import { SourceLink } from "./source-link";
import { entitySummary, getSourceById } from "@/lib/data";
import { renderSummaryMarkup } from "@/lib/markup";
import type { NewsItem } from "@/lib/types";

export function NewsCard({ item }: { item: NewsItem }) {
  const first = item.sources[0];
  const source = first !== undefined ? getSourceById(first.source) : undefined;
  const entityChips = item.entities
    .map((id) => entitySummary(id))
    .filter((entry): entry is { href: string; label: string } => entry !== null);

  return (
    <article className="rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-ink-faint">{item.publisher}</span>
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
      {source ? (
        <p className="mt-3">
          <SourceLink href={source.url} meta={source.publisher}>
            {source.title}
          </SourceLink>
        </p>
      ) : null}
    </article>
  );
}
