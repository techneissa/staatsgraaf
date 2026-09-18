"use client";

import type { ReactNode } from "react";
import { useT } from "@/components/i18n/use-t";

export type EntityFact = {
  label: ReactNode;
  value: ReactNode;
};

/**
 * CivLab-style two-column definition grid with inline label/value pairs,
 * used at the bottom of the entity header panel.
 */
export function EntityFacts({
  facts,
  labelKey = "factsLabel",
  className = "",
}: {
  facts: EntityFact[];
  labelKey?: string;
  className?: string;
}) {
  const t = useT("entity");
  const visible = facts.filter(
    (fact) => fact.value !== null && fact.value !== undefined && fact.value !== "",
  );
  if (visible.length === 0) return null;
  return (
    <dl
      aria-label={t(labelKey)}
      className={`grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 ${className}`.trim()}
    >
      {visible.map((fact, index) => (
        <div
          key={`fact-${index}`}
          className="border-line/60 border-t pt-2 first:border-t-0"
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{fact.label}</dt>
          <dd className="mt-0.5 text-sm text-ink">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
