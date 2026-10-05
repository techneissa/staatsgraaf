"use client";

import { useT } from "@/components/i18n/use-t";
import { formatCountIn } from "@/lib/format";
import { useLocale } from "@/components/i18n/language-provider";

/**
 * What sits under a filter bar: the count line while a filter is active, a
 * loading line while the rest of the list is on its way, and the empty or
 * failed state with a next step. One live region, so a screen reader hears the
 * result of a filter without the page moving.
 */
export function ListStatus({
  noun,
  shown,
  total,
  filtering,
  loading,
  failed,
  onClear,
  onRetry,
}: {
  noun: "People" | "Organizations" | "Positions";
  /** Rows that match, or null while the list is still loading. */
  shown: number | null;
  total: number;
  filtering: boolean;
  loading: boolean;
  failed: boolean;
  onClear: () => void;
  onRetry: () => void;
}) {
  const t = useT("entity");
  const locale = useLocale();
  const empty = shown === 0;
  return (
    <div role="status" className="mt-3 min-h-5 text-sm text-ink-muted">
      {empty ? (
        <div className="mt-5 flex flex-col items-start gap-2">
          <p className="text-ink">{t(`idxNo${noun}`)}</p>
          <p className="text-ink-faint">{t("idxNoResultsHelp")}</p>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-9 items-center rounded-pill border border-line bg-surface px-4 text-sm font-medium text-ink transition-fast hover:border-line-strong pointer-coarse:min-h-11"
          >
            {t("idxClearFilters")}
          </button>
        </div>
      ) : failed ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{t("idxLoadFailed")}</span>
          <button type="button" onClick={onRetry} className="min-h-9 text-accent-text underline underline-offset-2 pointer-coarse:min-h-11">
            {t("idxRetry")}
          </button>
        </p>
      ) : loading ? (
        <span>{t("idxLoading")}</span>
      ) : filtering && shown !== null ? (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="tabular-nums">
            {t(`idxCount${noun}`, { shown: formatCountIn(shown, locale), total: formatCountIn(total, locale) })}
          </span>
          <button type="button" onClick={onClear} className="min-h-9 text-accent-text underline underline-offset-2 pointer-coarse:min-h-11">
            {t("idxClearFilters")}
          </button>
        </span>
      ) : null}
    </div>
  );
}
