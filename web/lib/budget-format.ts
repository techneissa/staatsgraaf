/**
 * Budget amount formatting, free of dataset imports so client components can
 * use it. lib/budget.ts re-exports everything here.
 */
const euroFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const euroFormatterEn = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function budgetUnitFactor(unit: string | null | undefined): number {
  if (!unit) return 1;
  const normalized = unit.toLowerCase().replace(/\s+/g, "");
  if (/x1[.,]?000[.,]?000/.test(normalized)) return 1_000_000;
  if (/x1[.,]?000/.test(normalized)) return 1_000;
  return 1;
}

/**
 * A euro amount in at most four significant figures: billions and millions
 * get a suffix ("mld" and "mln" in Dutch, "B" and "M" in English, because a
 * Dutch "B" would read as biljoen), anything under a million is written out,
 * which is six digits at most. The exact amount stays available through
 * formatBudgetAmountExact, for a tooltip or a screen reader.
 */
export function formatEuroCompact(euros: number, locale: "nl" | "en" = "nl"): string {
  const sign = euros < 0 ? "−" : "";
  const abs = Math.abs(euros);
  const tag = locale === "en" ? "en-GB" : "nl-NL";
  const scaled = (divisor: number) => {
    const value = abs / divisor;
    const digits = value < 10 ? 2 : value < 100 ? 1 : 0;
    return new Intl.NumberFormat(tag, { maximumFractionDigits: digits }).format(value);
  };
  if (abs >= 1e9) return locale === "en" ? `${sign}€${scaled(1e9)}B` : `${sign}€ ${scaled(1e9)} mld`;
  if (abs >= 1e6) return locale === "en" ? `${sign}€${scaled(1e6)}M` : `${sign}€ ${scaled(1e6)} mln`;
  const whole = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(abs);
  return locale === "en" ? `${sign}€${whole}` : `${sign}€ ${whole}`;
}

export function formatBudgetAmount(
  value: number | null | undefined,
  unit: string | null | undefined,
  locale: "nl" | "en" = "nl",
): string | null {
  if (value === null || value === undefined) return null;
  return formatEuroCompact(value * budgetUnitFactor(unit), locale);
}

/** The exact amount in full euros, as the source states it, in the reader's locale. */
export function formatBudgetAmountExact(
  value: number | null | undefined,
  unit: string | null | undefined,
  locale: "nl" | "en" = "nl",
): string | null {
  if (value === null || value === undefined) return null;
  const formatter = locale === "en" ? euroFormatterEn : euroFormatter;
  return formatter.format(value * budgetUnitFactor(unit));
}

/**
 * A percentage in the reader's locale with one decimal: "3,7%" in Dutch,
 * "3.7%" in English. `signed` adds "+" or "−"; otherwise the absolute value
 * is shown, because the caller carries the direction with an arrow.
 */
export function formatPercent(
  value: number,
  locale: "nl" | "en" = "nl",
  options: { signed?: boolean } = {},
): string {
  const tag = locale === "en" ? "en-GB" : "nl-NL";
  const body = new Intl.NumberFormat(tag, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(value) / 100);
  if (!options.signed) return body;
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${body}`;
  if (rounded < 0) return `−${body}`;
  return body;
}

/** A share of a total, with "< 0,1%" for a share too small to show at one decimal. */
export function formatShare(value: number, locale: "nl" | "en" = "nl"): string {
  if (value > 0 && value < 0.05) return `< ${formatPercent(0.1, locale)}`;
  return formatPercent(value, locale);
}
