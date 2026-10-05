import { describe, expect, test } from "bun:test";
import { getBudgetByOrganizationSlug, getBudgetOverview, getBudgetPageSources, getBudgetTrends, getBudgetYears } from "./budget.ts";
import { budgetSeriesGap } from "./budget-notes.ts";
import { NEWS_DICT } from "./i18n/dict-news.ts";

describe("budget trends from the dataset", () => {
  const trends = getBudgetTrends();

  test("realized years are solid, budgeted years follow", () => {
    const financien = trends.ministries.find((entry) => entry.id === "org:ministerie-van-financien");
    const byYear = new Map(financien.points.map((point) => [point.year, point]));
    expect(byYear.get(2013).measure).toBe("actual");
    expect(byYear.get(2025).measure).toBe("actual");
    expect(byYear.get(2026).measure).toBe("budget");
    expect(byYear.get(2027).measure).toBe("budget");
    // The unit is EUR x 1,000 in the source: the series is in euros.
    expect(byYear.get(2026).value).toBe(57094502 * 1000);
  });

  test("the combined series starts where every ministry has a figure", () => {
    expect(trends.total.points[0].year).toBe(2019);
    expect(trends.total.points.every((point) => point.value !== null)).toBe(true);
    expect(trends.lateStarters.map((entry) => [entry.id, entry.from])).toEqual([
      ["org:ministerie-van-landbouw-visserij-voedselzekerheid-en-natuur", 2019],
    ]);
  });

  test("Landbouw has no figures before 2019 and a named gap", () => {
    const view = getBudgetByOrganizationSlug("ministerie-van-landbouw-visserij-voedselzekerheid-en-natuur");
    expect(view.trend[0].year).toBe(2019);
    const gap = budgetSeriesGap(view.organization.id);
    expect(gap.nl).toContain("2019");
    expect(gap.en).toContain("2019");
    expect(view.records.flatMap((record) => record.sources).some((ref) => ref.source === gap.sourceId)).toBe(true);
    expect(budgetSeriesGap("org:ministerie-van-defensie")).toBeNull();
  });
});

describe("overview per year", () => {
  test("every budget year gets a full overview and shares one source list", () => {
    const sources = getBudgetPageSources();
    for (const year of getBudgetYears()) {
      const overview = getBudgetOverview(year, sources);
      expect(overview.fiscalYear).toBe(year);
      expect(overview.items.length).toBe(12);
      expect(overview.sources).toBe(sources);
      for (const item of overview.items) {
        for (const number of item.footnotes) expect(number).toBeLessThanOrEqual(sources.length);
      }
    }
  });
});

describe("dictionary", () => {
  test("every budget key has Dutch and English text and no em dash", () => {
    for (const [key, value] of Object.entries(NEWS_DICT)) {
      if (!key.startsWith("budget")) continue;
      expect(value.nl.length).toBeGreaterThan(0);
      expect(value.en.length).toBeGreaterThan(0);
      expect(value.nl.includes("—") || value.en.includes("—")).toBe(false);
    }
  });
});
