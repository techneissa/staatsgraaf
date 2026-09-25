"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import { formatCountIn } from "@/lib/format";

/**
 * Small coloured icons that stand in for a label repeated on every item of a
 * list. The list defines them once in a legend (IconLegend) and each item
 * shows only the icon and its value (IconValue), which keeps the full label as
 * its accessible name and tooltip. One place, so the icons look the same on
 * every page.
 */
export type LegendIconKind = "tk" | "ek";

const ICONS: Record<LegendIconKind, { color: string; labelKey: string }> = {
  // Tweede Kamer: a filled chamber arch. Eerste Kamer: the same arch, outlined.
  tk: { color: "var(--t-color-sector-staten-generaal)", labelKey: "legendSeatsTk" },
  ek: { color: "var(--t-color-sector-hoge-colleges)", labelKey: "legendSeatsEk" },
};

export function LegendIcon({ kind, size = 14 }: { kind: LegendIconKind; size?: number }) {
  const { color } = ICONS[kind];
  const filled = kind === "tk";
  return (
    <svg aria-hidden="true" viewBox="0 0 16 12" width={size} height={(size * 12) / 16} className="inline-block shrink-0" style={{ color }}>
      <path
        d="M1.5 11A6.5 6.5 0 0 1 14.5 11H11A3 3 0 0 0 5 11Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The legend a list shows once, above its items. */
export function IconLegend({ kinds, className = "" }: { kinds: LegendIconKind[]; className?: string }) {
  const t = useT("common");
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted ${className}`.trim()} aria-label={t("legendLabel")}>
      {kinds.map((kind) => (
        <li key={kind} className="inline-flex items-center gap-1.5">
          <LegendIcon kind={kind} />
          <span>{t(ICONS[kind].labelKey)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * An icon and its value on one item. The full label is the accessible name
 * and the tooltip; nothing renders for a missing or zero value.
 */
export function IconValue({ kind, value, className = "" }: { kind: LegendIconKind; value: number | null | undefined; className?: string }): ReactNode {
  const t = useT("common");
  const locale = useLocale();
  if (value === null || value === undefined || value === 0) return null;
  const label = `${t(ICONS[kind].labelKey)}: ${formatCountIn(value, locale)}`;
  return (
    <span title={label} className={`inline-flex items-center gap-1 tabular-nums ${className}`.trim()}>
      <LegendIcon kind={kind} />
      <span aria-hidden="true">{formatCountIn(value, locale)}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
