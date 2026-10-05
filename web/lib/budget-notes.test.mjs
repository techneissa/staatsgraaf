import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { budgetComparabilityNote } from "./budget-notes.ts";
import { NEWS_DICT } from "./i18n/dict-news.ts";
import { PANELS_DICT } from "./i18n/dict-panels.ts";

describe("comparability notes", () => {
  test("Infrastructuur en Waterstaat carries a sourced note in both languages", () => {
    const note = budgetComparabilityNote("org:ministerie-van-infrastructuur-en-waterstaat");
    expect(note).not.toBeNull();
    expect(note.sourceId).toBe("src:rijksfinancien-begrotingsstaten-2013-2027");
    expect(note.nl).toContain("Bijdrage investeringsfondsen");
    expect(note.en).toContain("Contribution to investment funds");
    expect(note.nl).toContain("10,5 mld");
    expect(note.en).toContain("10.5B");
  });

  test("other ministries have none", () => {
    expect(budgetComparabilityNote("org:ministerie-van-defensie")).toBeNull();
    expect(budgetComparabilityNote("org:onbekend")).toBeNull();
  });
});

describe("net result", () => {
  test("net in data/budgets.json is spending minus revenue in every record", () => {
    const records = JSON.parse(readFileSync(new URL("../../data/budgets.json", import.meta.url), "utf8"));
    let checked = 0;
    for (const record of records) {
      for (const set of [record.current, record.previous]) {
        if (!set || set.net === null) continue;
        const spending = set.spendingActual ?? set.spendingBudget;
        expect(set.net).toBe(spending - (set.revenue ?? 0));
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(30);
  });

  test("the reader-facing labels say spending minus revenue, never the reverse", () => {
    for (const label of [NEWS_DICT.budgetNetLabel, NEWS_DICT.budgetNetFormula, PANELS_DICT.budgetNet]) {
      expect(label.nl.toLowerCase()).toContain("uitgaven min ontvangsten");
      expect(label.en.toLowerCase()).toContain("spending minus revenue");
      expect(label.nl.toLowerCase()).not.toContain("saldo");
    }
  });
});

describe("change sentence", () => {
  test("is one sentence, not a lead-in that ends with a colon", () => {
    for (const key of ["budgetChangeSrUp", "budgetChangeSrDown", "budgetChangeSrFlat"]) {
      for (const locale of ["nl", "en"]) {
        const text = NEWS_DICT[key][locale];
        expect(text.trimEnd().endsWith(":")).toBe(false);
        expect(text.trimEnd().endsWith(".")).toBe(true);
      }
    }
  });
});
