import type { ReactNode } from "react";

export type EntityFact = {
  label: string;
  value: ReactNode;
};

export function EntityFacts({ facts, label = "Kenmerken" }: { facts: EntityFact[]; label?: string }) {
  const visible = facts.filter(
    (fact) => fact.value !== null && fact.value !== undefined && fact.value !== "",
  );
  if (visible.length === 0) return null;
  return (
    <dl aria-label={label} className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {visible.map((fact) => (
        <div key={fact.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            {fact.label}
          </dt>
          <dd className="mt-0.5 text-sm text-ink">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
