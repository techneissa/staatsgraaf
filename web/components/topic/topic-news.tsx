import { EmptyState } from "@/components/empty-state";
import { NewsCard } from "@/components/news-card";
import type { NewsItem } from "@/lib/types";

export function TopicNews({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nog geen nieuws bij dit onderwerp"
        description="Zodra de nieuwsbronnen zijn ontsloten, verschijnen hier berichten die aan dit onderwerp zijn gekoppeld, met bron en datum. Er is nu geen bericht dat aantoonbaar bij dit onderwerp hoort."
      />
    );
  }

  return (
    <ol className="mt-3 space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <NewsCard item={item} />
        </li>
      ))}
    </ol>
  );
}
