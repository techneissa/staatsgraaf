import type { ReactNode } from "react";

export type StatStripItem = { key: string; label: ReactNode; value: ReactNode; sub: ReactNode };

/**
 * Three key figures in one row between hairlines, no boxes. Stays three
 * columns on a 375 px phone; the labels wrap.
 */
export function StatStrip({ items, className = "" }: { items: StatStripItem[]; className?: string }) {
  return (
    <dl className={`grid grid-cols-3 divide-x divide-line border-y border-line ${className}`.trim()}>
      {items.map((item) => (
        <div key={item.key} className="flex min-w-0 flex-col px-3 py-3 first:pl-0 last:pr-0 sm:px-4">
          <dt className="min-h-7 text-[11px] font-medium leading-tight text-ink-faint">{item.label}</dt>
          <dd className="pt-1.5">
            <span className="block text-2xl font-semibold leading-tight tabular-nums tracking-tight text-ink">
              {item.value}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{item.sub}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
