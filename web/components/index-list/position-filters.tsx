"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { useT } from "@/components/i18n/use-t";
import { formatCountIn } from "@/lib/format";
import { ORG_TYPE_LABELS, ORG_TYPE_LABELS_EN } from "@/lib/labels";
import type { OrgType } from "@/lib/types";
import { IndexSearchField } from "./search-field";

const TYPE_SHORT: Record<string, { nl: string; en: string }> = {
  elected: { nl: "Gekozen", en: "Elected" },
  dept_head: { nl: "Hoofden", en: "Heads" },
  commission: { nl: "Commissies", en: "Committees" },
};

const CELL =
  "flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 text-start text-sm transition-[border-color,background-color,color] duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Search and type on the positions index: a full-width field and a compact
 * two-by-two (one row from the lg container) labelled grid with counts. The
 * bar is sticky and a known height, so typing does not move the page.
 */
export function PositionFilters({
  query,
  group,
  groups,
  total,
  onQuery,
  onGroup,
  toolbar,
}: {
  query: string;
  group: string;
  groups: { key: OrgType; count: number }[];
  total: number;
  onQuery: (value: string) => void;
  onGroup: (value: string) => void;
  /** Column headers of the positions table, kept in the sticky bar. */
  toolbar?: ReactNode;
}) {
  const t = useT("entity");
  const locale = useLocale();
  const en = locale === "en";

  return (
    <div className="sticky top-0 z-10 -mx-2 mt-6 border-b border-line/70 bg-canvas px-2 pb-2 pt-1 contain-layout lg:bg-canvas/90 lg:backdrop-blur-md">
      <IndexSearchField
        value={query}
        onChange={onQuery}
        label={t("idxSearchPositions")}
        placeholder={t("idxSearchPositionsPlaceholder")}
        className="w-full min-w-0"
      />
      <div role="group" aria-label={t("idxTypeFilterLabel")} className="mt-2 grid grid-cols-2 gap-1 @lg:grid-cols-4">
        <button
          type="button"
          aria-pressed={group === ""}
          onClick={() => onGroup("")}
          className={`${CELL} ${group === "" ? "border-ink bg-surface-raised text-ink" : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"}`}
        >
          <span className="truncate font-medium">{t("idxTypeAll")}</span>
          <span className="shrink-0 text-xs tabular-nums text-ink-faint">{formatCountIn(total, locale)}</span>
        </button>
        {groups.map((item) => {
          const active = group === item.key;
          const short = TYPE_SHORT[item.key];
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              title={en ? ORG_TYPE_LABELS_EN[item.key] : ORG_TYPE_LABELS[item.key]}
              onClick={() => onGroup(active ? "" : item.key)}
              className={`${CELL} ${active ? "border-ink bg-surface-raised text-ink" : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"}`}
            >
              <span className="min-w-0 truncate font-medium">
                {short ? (en ? short.en : short.nl) : <LocaleLabel kind="type" value={item.key} />}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-ink-faint">{formatCountIn(item.count, locale)}</span>
            </button>
          );
        })}
      </div>
      {toolbar}
    </div>
  );
}
