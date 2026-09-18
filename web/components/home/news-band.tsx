import { EmptyState } from "@/components/empty-state";
import { NewsCard } from "@/components/news-card";
import type { NewsItem } from "@/lib/types";

export function NewsBand({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nog geen nieuws"
        description="Zodra de nieuwsbronnen zijn ontsloten, verschijnen hier recente berichten met gekoppelde organisaties, personen en een bron per bericht."
      />
    );
  }

  return (
    <ol className="mt-3 space-y-3">
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-3">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Bron ${index + 1}: ${item.publisher}`}
            className="mt-1 shrink-0 text-xs font-medium tabular-nums text-accent-text underline-offset-2 hover:underline"
          >
            [{index + 1}]
          </a>
          <div className="min-w-0 flex-1">
            <NewsCard item={item} />
          </div>
        </li>
      ))}
    </ol>
  );
}
