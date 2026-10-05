import type { ReactNode } from "react";
import type { IconNode } from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";

/**
 * A headline figure: a tinted icon chip, a label, the amount and optional
 * extras. The tint is a design token (`tone`, a sector colour name), a
 * redundant cue: the label always says what the figure is. The amount never
 * breaks across lines; tiles reflow by the width of their column, so the
 * caller puts them in a container-query grid.
 */
export function StatTile({
  icon,
  tone,
  label,
  value,
  caption,
  extra,
}: {
  icon: IconNode;
  /** A token name from shared/tokens.json, for example "sector-regering". */
  tone: string;
  label: ReactNode;
  value: ReactNode;
  caption?: ReactNode;
  extra?: ReactNode;
}) {
  const color = `var(--t-color-${tone})`;
  return (
    <div className="flex min-w-0 flex-col rounded-md border border-line bg-surface px-3 py-2.5 @[40rem]:px-4 @[40rem]:py-3">
      <dt className="flex items-start gap-2 text-xs leading-snug text-ink-muted">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
        >
          <LucideIcon icon={icon} size={17} />
        </span>
        <span className="min-w-0 pt-1.5">
          {label}
          {caption ? <span className="text-ink-faint"> · {caption}</span> : null}
        </span>
      </dt>
      <dd className="mt-1.5 whitespace-nowrap text-xl font-semibold tracking-tight text-ink">{value}</dd>
      {extra !== undefined ? <dd className="min-h-5">{extra}</dd> : null}
    </div>
  );
}
