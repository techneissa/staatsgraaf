"use client";

import { EmptyState } from "@/components/empty-state";
import { useDict } from "@/components/i18n/use-t";

type NewsDictKey = Parameters<ReturnType<typeof useDict<"news">>>[0];

/** Empty state whose title and description swap with the stored locale. */
export function DictEmptyState({
  titleKey,
  descriptionKey,
}: {
  titleKey: string;
  descriptionKey?: string;
}) {
  const t = useDict("news");
  return (
    <EmptyState
      title={t(titleKey)}
      description={descriptionKey ? t(descriptionKey) : undefined}
    />
  );
}
