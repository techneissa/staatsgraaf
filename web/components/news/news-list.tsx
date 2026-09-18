import { NewsCard } from "@/components/news-card";
import { formatCount } from "@/lib/format";
import type { NewsItem } from "@/lib/types";

export function NewsList({
  items,
  initialLimit = 6,
  emptyTitle = "Nog geen nieuws",
  emptyDescription = "Zodra de nieuwsbronnen zijn ontsloten, verschijnen hier berichten met gekoppelde organisaties, personen en een bron per bericht.",
}: {
  items: NewsItem[];
  initialLimit?: number;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-3 rounded-md border border-line bg-surface-raised p-4">
        <p className="text-sm font-semibold text-ink">{emptyTitle}</p>
        <p className="mt-1 text-sm text-ink-muted">{emptyDescription}</p>
      </div>
    );
  }

  const visible = items.slice(0, initialLimit);
  const hidden = items.slice(initialLimit);

  return (
    <div>
      <ol className="mt-3 list-none space-y-3 p-0">
        {visible.map((item, index) => (
          <li key={item.id}>
            <NewsCard item={item} rank={index + 1} as="div" />
          </li>
        ))}
      </ol>
      {hidden.length > 0 ? (
        <details className="group mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm font-medium text-ink transition-fast hover:border-line-strong">
            <span className="group-open:hidden">Laad meer ({formatCount(hidden.length)})</span>
            <span className="hidden group-open:inline">Minder weergeven</span>
          </summary>
          <ol className="mt-3 list-none space-y-3 p-0">
            {hidden.map((item, index) => (
              <li key={item.id}>
                <NewsCard item={item} rank={visible.length + index + 1} as="div" />
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}
