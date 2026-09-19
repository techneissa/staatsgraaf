import { getDataset, getOrganizationById, getOrganizationBySlug } from "./data";
import type { AmountSet, Budget, Organization, SourceRef } from "./types";

export const BUDGET_OVERVIEW_YEAR = 2026;
export const BUDGET_PREVIOUS_YEAR = BUDGET_OVERVIEW_YEAR - 1;

const euroFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export type BudgetDelta = {
  absolute: number;
  percent: number | null;
};

export type BudgetOverviewItem = {
  organization: Organization;
  record: Budget;
  current: AmountSet;
  previous: AmountSet | null;
  spendingDelta: BudgetDelta | null;
  /** Share of the summed spending budget across all items, in percent, or null when not computable. */
  sharePercent: number | null;
  /** 1-based footnote numbers of the sources backing this record, in the order of the page source list. */
  footnotes: number[];
  /** First sentence of the organization description: a factual one-line summary, sourced with the organization. */
  description: string | null;
};

export type BudgetTotals = {
  spendingBudget: number | null;
  spendingActual: number | null;
  revenue: number | null;
  net: number | null;
  spendingBudgetCounted: number;
  expected: number;
};

export type BudgetOverview = {
  fiscalYear: number;
  previousFiscalYear: number;
  unit: string | null;
  items: BudgetOverviewItem[];
  totals: BudgetTotals;
  previousTotals: BudgetTotals;
  spendingDelta: BudgetDelta | null;
  /** Deduplicated sources for the page, in first-appearance order: the footnote list order. */
  sources: SourceRef[];
};

export type BudgetHistoryRow = {
  fiscalYear: number;
  spendingActual: number | null;
  revenue: number | null;
};

export type BudgetBreakdownRow = {
  category: string;
  amount: number | null;
  type: "spending" | "revenue";
};

export type BudgetOrganizationView = {
  organization: Organization;
  records: Budget[];
  unit: string | null;
  currentRecord: Budget | null;
  previousRecord: Budget | null;
  current: AmountSet | null;
  previous: AmountSet | null;
  history: BudgetHistoryRow[];
  earliestHistoryYear: number | null;
  breakdown: BudgetBreakdownRow[];
  sources: SourceRef[];
};

export function emptyAmountSet(): AmountSet {
  return {
    spendingBudget: null,
    spendingActual: null,
    revenue: null,
    net: null,
    nonprofit: null,
  };
}

export function budgetUnitFactor(unit: string | null | undefined): number {
  if (!unit) return 1;
  const normalized = unit.toLowerCase().replace(/\s+/g, "");
  if (/x1[.,]?000[.,]?000/.test(normalized)) return 1_000_000;
  if (/x1[.,]?000/.test(normalized)) return 1_000;
  return 1;
}

export function budgetUnitLabel(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const factor = budgetUnitFactor(unit);
  if (factor === 1_000) return "x 1.000 euro";
  if (factor === 1_000_000) return "x 1.000.000 euro";
  return unit;
}

export function formatBudgetAmount(
  value: number | null | undefined,
  unit: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  return euroFormatter.format(value * budgetUnitFactor(unit));
}

export function formatBudgetPercent(value: number): string {
  return `${percentFormatter.format(Math.abs(value))}%`;
}

export function budgetDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
): BudgetDelta | null {
  if (current === null || current === undefined) return null;
  if (previous === null || previous === undefined) return null;
  const absolute = current - previous;
  const percent = previous === 0 ? null : (absolute / Math.abs(previous)) * 100;
  return { absolute, percent };
}

/** The first sentence of a description: everything up to and including the first sentence-ending mark. */
export function firstSentence(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/^[^.!?]*[.!?]/);
  const sentence = match?.[0] ?? text;
  return sentence.trim() || null;
}

/**
 * The footnote numbers a record earns on the page: the 1-based position of each
 * cited source in the deduplicated page source list, in list order.
 */
export function budgetFootnoteNumbers(
  recordSources: SourceRef[],
  pageSources: SourceRef[],
): number[] {
  const cited = new Set(recordSources.map((ref) => ref.source));
  const numbers: number[] = [];
  pageSources.forEach((ref, index) => {
    if (cited.has(ref.source)) numbers.push(index + 1);
  });
  return numbers;
}

function sumAmounts(amounts: AmountSet[]): BudgetTotals {
  let spendingBudget: number | null = null;
  let spendingActual: number | null = null;
  let revenue: number | null = null;
  let net: number | null = null;
  let spendingBudgetCounted = 0;

  for (const amount of amounts) {
    if (amount.spendingBudget !== null) {
      spendingBudget = (spendingBudget ?? 0) + amount.spendingBudget;
      spendingBudgetCounted += 1;
    }
    if (amount.spendingActual !== null) {
      spendingActual = (spendingActual ?? 0) + amount.spendingActual;
    }
    if (amount.revenue !== null) {
      revenue = (revenue ?? 0) + amount.revenue;
    }
    if (amount.net !== null) {
      net = (net ?? 0) + amount.net;
    }
  }

  return {
    spendingBudget,
    spendingActual,
    revenue,
    net,
    spendingBudgetCounted,
    expected: amounts.length,
  };
}

function groupByOrganization(budgets: Budget[]): Map<string, Budget[]> {
  const map = new Map<string, Budget[]>();
  for (const budget of budgets) {
    const list = map.get(budget.organization);
    if (list) {
      list.push(budget);
    } else {
      map.set(budget.organization, [budget]);
    }
  }
  return map;
}

export function getBudgetOverview(): BudgetOverview {
  const { budgets } = getDataset();
  const years = [...new Set(budgets.map((budget) => budget.fiscalYear))].sort((a, b) => b - a);
  const fiscalYear = years.includes(BUDGET_OVERVIEW_YEAR)
    ? BUDGET_OVERVIEW_YEAR
    : (years[0] ?? BUDGET_OVERVIEW_YEAR);
  const previousFiscalYear = fiscalYear - 1;

  const items: BudgetOverviewItem[] = [];
  for (const [organizationId, records] of groupByOrganization(budgets)) {
    const organization = getOrganizationById(organizationId);
    if (!organization) continue;
    const record = records.find((entry) => entry.fiscalYear === fiscalYear);
    if (!record) continue;
    const current = record.current ?? emptyAmountSet();
    const previousRecord = records.find((entry) => entry.fiscalYear === previousFiscalYear);
    const previous = record.previous ?? previousRecord?.current ?? null;
    items.push({
      organization,
      record,
      current,
      previous,
      spendingDelta: budgetDelta(current.spendingBudget, previous?.spendingBudget),
      sharePercent: null,
      footnotes: [],
      description: firstSentence(organization.description),
    });
  }

  items.sort(
    (a, b) =>
      (b.current.spendingBudget ?? Number.NEGATIVE_INFINITY) -
        (a.current.spendingBudget ?? Number.NEGATIVE_INFINITY) ||
      a.organization.name.localeCompare(b.organization.name, "nl"),
  );

  const unit = items.find((item) => item.record.unit)?.record.unit ?? null;
  const totals = sumAmounts(items.map((item) => item.current));
  const previousSets = items
    .map((item) => item.previous)
    .filter((amount): amount is AmountSet => amount !== null);
  const previousTotals = sumAmounts(previousSets);
  const sources = dedupeSources(items.map((item) => item.record));
  const totalSpendingBudget = totals.spendingBudget;

  const enriched = items.map((item) => ({
    ...item,
    sharePercent:
      item.current.spendingBudget !== null &&
      totalSpendingBudget !== null &&
      totalSpendingBudget !== 0
        ? (item.current.spendingBudget / totalSpendingBudget) * 100
        : null,
    footnotes: budgetFootnoteNumbers(item.record.sources, sources),
    description: firstSentence(item.organization.description),
  }));

  return {
    fiscalYear,
    previousFiscalYear,
    unit,
    items: enriched,
    totals,
    previousTotals,
    spendingDelta: budgetDelta(totals.spendingBudget, previousTotals.spendingBudget),
    sources,
  };
}

export function getBudgetOverviewSources(overview: BudgetOverview): SourceRef[] {
  return overview.sources;
}

export function getBudgetOrganizations(): Organization[] {
  const { budgets } = getDataset();
  const seen = new Set<string>();
  const organizations: Organization[] = [];
  for (const budget of budgets) {
    if (seen.has(budget.organization)) continue;
    seen.add(budget.organization);
    const organization = getOrganizationById(budget.organization);
    if (organization) organizations.push(organization);
  }
  return organizations.sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

function mergeHistory(records: Budget[]): BudgetHistoryRow[] {
  const byYear = new Map<number, BudgetHistoryRow>();
  for (const record of records) {
    const rows = Array.isArray(record.history) ? record.history : [];
    for (const row of rows) {
      const existing = byYear.get(row.fiscalYear);
      byYear.set(row.fiscalYear, {
        fiscalYear: row.fiscalYear,
        spendingActual: existing?.spendingActual ?? row.spendingActual ?? null,
        revenue: existing?.revenue ?? row.revenue ?? null,
      });
    }
  }
  return [...byYear.values()].sort((a, b) => a.fiscalYear - b.fiscalYear);
}

function collectBreakdown(record: Budget | null): BudgetBreakdownRow[] {
  if (!record) return [];
  const rows = record.breakdown;
  return Array.isArray(rows) ? rows : [];
}

function dedupeSources(records: Budget[]): SourceRef[] {
  const seen = new Set<string>();
  const sources: SourceRef[] = [];
  for (const record of records) {
    for (const ref of record.sources) {
      if (seen.has(ref.source)) continue;
      seen.add(ref.source);
      sources.push(ref);
    }
  }
  return sources;
}

export function getBudgetByOrganizationSlug(slug: string): BudgetOrganizationView | null {
  const organization = getOrganizationBySlug(slug);
  if (!organization) return null;

  const records = getDataset()
    .budgets.filter((budget) => budget.organization === organization.id)
    .sort((a, b) => b.fiscalYear - a.fiscalYear);
  if (records.length === 0) return null;

  const currentRecord =
    records.find((record) => record.fiscalYear === BUDGET_OVERVIEW_YEAR) ?? records[0] ?? null;
  const previousRecord =
    records.find((record) => record.fiscalYear === BUDGET_PREVIOUS_YEAR) ?? null;

  const current = currentRecord?.current ?? null;
  const previous = currentRecord?.previous ?? previousRecord?.current ?? null;
  const history = mergeHistory(records);

  return {
    organization,
    records,
    unit: currentRecord?.unit ?? records[0]?.unit ?? null,
    currentRecord,
    previousRecord,
    current,
    previous,
    history,
    earliestHistoryYear: history.length > 0 ? history[0].fiscalYear : null,
    breakdown: collectBreakdown(currentRecord),
    sources: dedupeSources(records),
  };
}
