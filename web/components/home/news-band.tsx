import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { NewsCard } from "@/components/news-card";
import { getS } from "@/lib/i18n/server-strings";
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
    <div>
      <ol className="space-y-2.5">
        {items.map((item, index) => (
          <li key={item.id}>
            <NewsCard item={item} rank={index + 1} />
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm">
        <Link
          href="/nieuws/"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-text underline-offset-2 hover:underline"
        >
          {getS("home", "newsReadMore")}
          <span aria-hidden="true">&rsaquo;</span>
        </Link>
      </p>
    </div>
  );
}
