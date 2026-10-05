import { describe, expect, test } from "bun:test";
import {
  clipText,
  foldText,
  INDEX_FIRST_SCREEN,
  indexListUrl,
  organizationSearchText,
  personSearchText,
  positionSearchText,
  searchTerms,
} from "./index-lists";
import { buildOrganizationRows, buildPeopleRows, buildPositionRows } from "./index-rows";
import { getOrganizations, getPeople, getPositions } from "./data";

describe("search text", () => {
  test("folds case and accents", () => {
    expect(foldText("Élise Ünal")).toBe("elise unal");
    expect(searchTerms("  Van  Weel ")).toEqual(["van", "weel"]);
  });

  test("a person matches on name, alias, party and role in both languages", () => {
    const text = personSearchText({ s: "x", n: "Rob Jetten", l: "J", g: "regering", p: "D66", a: "R. Jetten", r: "Minister-president", re: "Prime Minister" });
    for (const term of ["jetten", "d66", "minister-president", "prime", "r. jetten"]) expect(text).toContain(term);
  });

  test("an organisation and a position match on their English gloss", () => {
    expect(organizationSearchText({ s: "a", n: "Tweede Kamer", ge: "House of Representatives", st: "tweede-kamer", b: "staten-generaal" })).toContain("representatives");
    expect(positionSearchText({ s: "a", n: "Minister van Financiën", ge: "Minister of Finance", t: "dept_head", o: "Ministerie van Financiën", b: "regering" })).toContain("finance");
  });
});

describe("clipText", () => {
  test("leaves a short text alone and marks a cut at a word", () => {
    expect(clipText("Kort.", 50)).toBe("Kort.");
    const clipped = clipText("een twee drie vier vijf zes zeven acht negen tien", 20);
    expect(clipped.endsWith("…")).toBe(true);
    expect(clipped.length).toBeLessThanOrEqual(21);
    expect("een twee drie vier vijf zes zeven acht negen tien".startsWith(clipped.slice(0, -1))).toBe(true);
  });
});

describe("list rows", () => {
  test("every entity of the dataset is in its list, once, with a unique slug", () => {
    const people = buildPeopleRows();
    expect(people.rows.length).toBe(getPeople().length);
    expect(new Set(people.rows.map((row) => row.s)).size).toBe(people.rows.length);
    expect(people.total).toBe(people.rows.length);

    const organizations = buildOrganizationRows();
    expect(organizations.rows.length).toBe(getOrganizations().length);
    expect(new Set(organizations.rows.map((row) => row.s)).size).toBe(organizations.rows.length);
    expect(organizations.groups.reduce((sum, group) => sum + group.count, 0)).toBe(organizations.total);

    const positions = buildPositionRows();
    expect(positions.rows.length).toBe(getPositions().length);
    expect(new Set(positions.rows.map((row) => row.s)).size).toBe(positions.rows.length);
    expect(positions.groups.reduce((sum, group) => sum + group.count, 0)).toBe(positions.total);
  });

  test("rows come in display order: people by letter, groups in group order", () => {
    const { rows } = buildPeopleRows();
    const letters = rows.map((row) => row.l);
    expect(letters).toEqual([...letters].sort((a, b) => a.localeCompare(b)));
    const organizations = buildOrganizationRows();
    const order = organizations.groups.map((group) => group.key);
    const seen = organizations.rows.map((row) => order.indexOf(row.b));
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });

  test("the first screen is a small slice of each list", () => {
    expect(INDEX_FIRST_SCREEN.personen).toBeLessThan(buildPeopleRows().rows.length);
    expect(indexListUrl("posities")).toBe("/peek/lists/posities.json");
  });
});
