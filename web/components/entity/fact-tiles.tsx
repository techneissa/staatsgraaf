"use client";

import type { ReactNode } from "react";
import { useT } from "@/components/i18n/use-t";

export type FactTile = {
  key: string;
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  /** A long value such as a list of aliases takes a whole row. */
  wide?: boolean;
};

/**
 * Key facts as small tiles: an icon, a quiet label and the value. Tiles sit
 * side by side as the container allows and wrap on a phone; on a narrow
 * container they share the row evenly, on a wide one they keep their own width.
 */
export function FactTiles({ facts, className = "" }: { facts: FactTile[]; className?: string }) {
  const t = useT("entity");
  const visible = facts.filter((fact) => fact.value !== null && fact.value !== undefined && fact.value !== "");
  if (visible.length === 0) return null;
  return (
    <div className={`@container ${className}`.trim()}>
      <dl aria-label={t("factsLabel")} className="flex flex-wrap gap-2">
        {visible.map((fact) => (
          <div
            key={fact.key}
            className={`flex min-w-0 max-w-full grow items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2 ${
              fact.wide ? "basis-full @2xl:basis-auto" : "basis-[9.5rem] @2xl:grow-0 @2xl:basis-auto"
            }`}
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-surface-raised text-ink-muted"
            >
              {fact.icon}
            </span>
            <div className="min-w-0">
              <dt className="text-[11px] leading-tight text-ink-faint">{fact.label}</dt>
              <dd className="text-sm leading-snug text-ink break-words">{fact.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A small round swatch in a branch or party colour, the size of an icon. */
export function ColorDot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />;
}
