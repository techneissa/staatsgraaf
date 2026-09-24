"use client";

import { SourceLink } from "@/components/source-link";
import { useDict } from "@/components/i18n/use-t";

export type SourceNoteItem = {
  id: string;
  title: string | null;
  url: string | null;
};

/** The "Bron:" line under a budget table. The server resolves the links. */
export function SourceNote({ items }: { items: SourceNoteItem[] }) {
  const t = useDict("news");
  if (items.length === 0) return null;
  return (
    <p className="mt-2 text-xs text-ink-faint">
      {t("budgetSourceLabel")}{" "}
      {items.map((item, index) => (
        <span key={`${item.id}-${index}`} className="mt-0.5 block">
          {item.url !== null && item.title !== null ? (
            <SourceLink href={item.url}>{item.title}</SourceLink>
          ) : (
            <span>{t("budgetUnknownSource", { id: item.id })}</span>
          )}
        </span>
      ))}
    </p>
  );
}
