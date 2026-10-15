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
  /** A short explanation of jargon, shown quietly under the value. */
  hint?: ReactNode;
  /** The value is a link (a count that jumps to a section, or an official page). */
  href?: string;
  /** Open `href` in a new tab. Used for the legal source and the official website. */
  external?: boolean;
  /** Left border in a branch or accent colour (FactTiles only). */
  accent?: string;
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
          // A dl group holds its dt and dd directly; the icon sits inside the dt, placed beside both.
          <div
            key={fact.key}
            className={`relative min-w-0 max-w-full grow rounded-md border border-line bg-surface py-2 pl-[3.125rem] pr-3 ${
              fact.wide ? "basis-full @2xl:basis-auto" : "basis-[9.5rem] @2xl:grow-0 @2xl:basis-auto"
            }`}
          >
            <dt className="text-[11px] leading-tight text-ink-faint">
              <span
                aria-hidden="true"
                className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm bg-surface-raised text-ink-muted"
              >
                {fact.icon}
              </span>
              {fact.label}
            </dt>
            <dd className="text-sm leading-snug text-ink break-words">
              {fact.value}
              {fact.hint ? <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">{fact.hint}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Facts as a wrapping meta row: icon plus value, no boxes. The label is the
 * accessible name, not a second visible line. Used on organisation headers.
 */
export function FactChips({ facts, className = "" }: { facts: FactTile[]; className?: string }) {
  const t = useT("entity");
  const common = useT("common");
  const visible = facts.filter((fact) => fact.value !== null && fact.value !== undefined && fact.value !== "");
  if (visible.length === 0) return null;
  return (
    <div className={className}>
      <dl aria-label={t("factsLabel")} className="flex flex-wrap items-center gap-x-3.5 gap-y-0.5">
        {visible.map((fact) => {
          const value = (
            <>
              <span className="min-w-0 break-words">{fact.value}</span>
              {fact.hint ? <span className="text-[11px] text-ink-faint">{fact.hint}</span> : null}
            </>
          );
          return (
            <div
              key={fact.key}
              className="inline-flex max-w-full min-w-0 items-center gap-1.5 py-1 pointer-coarse:min-h-11"
            >
              <dt className="flex shrink-0 items-center text-ink-faint">
                <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5">
                  {fact.icon}
                </span>
                <span className="sr-only">{fact.label}</span>
              </dt>
              <dd className="min-w-0 text-sm leading-snug text-ink">
                {fact.href !== undefined ? (
                  <a
                    href={fact.href}
                    {...(fact.external === true ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="inline-flex min-w-0 max-w-full items-baseline gap-1 text-accent-text underline-offset-2 hover:underline"
                  >
                    {value}
                    {fact.external === true ? (
                      <span className="sr-only">
                        {" "}
                        {common("opensNewTab")}
                      </span>
                    ) : null}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/** A small round swatch in a branch or party colour, the size of an icon. */
export function ColorDot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />;
}
