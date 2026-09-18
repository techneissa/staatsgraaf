import { EmptyState } from "@/components/empty-state";
import { NewsCard } from "@/components/news-card";
import type { NewsItem } from "@/lib/types";

export function TopicNews({ items, total }: { items: NewsItem[]; total?: number }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nog geen nieuws bij dit onderwerp"
        description="Zodra de nieuwsbronnen zijn ontsloten, verschijnen hier berichten die aan dit onderwerp zijn gekoppeld, met bron en datum. Er is nu geen bericht dat aantoonbaar bij dit onderwerp hoort."
      />
    );
  }

  const count = total ?? items.length;

  return (
    <>
      {count > items.length ? (
        <p className="mt-3 text-xs tabular-nums text-ink-faint">
          {items.length} van {count} berichten weergegeven, de meest recente eerst.
        </p>
      ) : null}
      <ol className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <NewsCard item={item} />
          </li>
        ))}
      </ol>
    </>
  );
}
