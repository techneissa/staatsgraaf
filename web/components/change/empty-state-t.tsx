"use client";

import type { ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import type { DictArea } from "@/lib/i18n/dicts";
import { useT } from "@/components/i18n/use-t";

/**
 * EmptyState wrapper for server components: pass dictionary keys and the
 * client-side locale picks the rendered language after hydration.
 */
export function EmptyStateT({
  area = "home",
  title,
  titleVars,
  description,
  descriptionVars,
  children,
}: {
  area?: DictArea;
  title: string;
  titleVars?: Record<string, string | number>;
  description?: string;
  descriptionVars?: Record<string, string | number>;
  children?: ReactNode;
}) {
  const t = useT(area);
  return (
    <EmptyState
      title={t(title, titleVars)}
      description={description !== undefined ? t(description, descriptionVars) : undefined}
    >
      {children}
    </EmptyState>
  );
}
