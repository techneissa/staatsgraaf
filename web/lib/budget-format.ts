/**
 * Budget amount formatting, free of dataset imports so client components can
 * use it. lib/budget.ts re-exports everything here.
 */
const euroFormatter = new Intl.NumberFormat("nl-NL", {
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

/** The exact amount in full euros, as the source states it. */
export function formatBudgetAmountExact(
  value: number | null | undefined,
  unit: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  return euroFormatter.format(value * budgetUnitFactor(unit));
}
