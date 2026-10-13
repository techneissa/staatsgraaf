import { describe, expect, test } from "bun:test";
import {
  clipText,
  dominantSubtype,
  foldText,
  INDEX_FIRST_SCREEN,
  indexListUrl,
  initialOrganizationRows,
  organizationSearchText,
  organizationTree,
  OTHER_SUBGROUP,
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

describe("organisations as a tree", () => {
  const { rows, groups } = buildOrganizationRows();

  test("a body nests only under a parent of its own group, and every parent exists", () => {
    const bySlug = new Map(rows.map((row) => [row.s, row]));
    for (const row of rows) {
      if (row.pa == null) continue;
      const parent = bySlug.get(row.pa);
      expect(parent).toBeDefined();
      expect(parent?.b).toBe(row.b);
    }
  });

  test("the group counts keep every body, and the top-level counts leave out the nested ones", () => {
    for (const group of groups) {
      const inGroup = rows.filter((row) => row.b === group.key);
      expect(inGroup.length).toBe(group.count);
      expect(organizationTree(inGroup).tops.length).toBe(group.top);
    }
    // The gemeenteraad and the college of a gemeente are not rows of their own.
    const lokaal = groups.find((group) => group.key === "decentraal-lokaal");
    expect(lokaal && lokaal.top).toBeLessThan(lokaal ? lokaal.count / 2 : 0);
  });

  test("the gemeenten are split by provincie and the zelfstandige organen by ministerie, every row in one subgroup", () => {
    for (const group of groups) {
      const inGroup = rows.filter((row) => row.b === group.key);
      if (!group.subgroups) {
        for (const row of inGroup) expect(row.sg ?? null).toBeNull();
        continue;
      }
      const keys = new Set(group.subgroups.map((subgroup) => subgroup.key));
      for (const row of inGroup) expect(keys.has(row.sg)).toBe(true);
      const { tops } = organizationTree(inGroup);
      expect(group.subgroups.reduce((sum, subgroup) => sum + subgroup.count, 0)).toBe(tops.length);
      // A nested body sits in the subgroup of its parent.
      const bySlug = new Map(inGroup.map((row) => [row.s, row]));
      for (const row of inGroup) if (row.pa != null) expect(row.sg).toBe(bySlug.get(row.pa)?.sg);
    }
    const lokaal = groups.find((group) => group.key === "decentraal-lokaal");
    expect(lokaal?.by).toBe("provincie");
    // Twelve provincies, and the samenwerkingsverbanden last.
    expect(lokaal?.subgroups?.filter((subgroup) => subgroup.key !== OTHER_SUBGROUP).length).toBe(12);
    expect(lokaal?.subgroups?.at(-1)?.key).toBe(OTHER_SUBGROUP);
    for (const row of rows) if (row.st === "gemeente") expect(row.sg).not.toBe(OTHER_SUBGROUP);
    expect(lokaal?.units).toBe(rows.filter((row) => row.st === "gemeente").length);
    const zelfstandig = groups.find((group) => group.key === "zelfstandig");
    expect(zelfstandig?.by).toBe("ministerie");
    for (const subgroup of zelfstandig?.subgroups ?? []) if (subgroup.key !== OTHER_SUBGROUP) expect(subgroup.id?.startsWith("org:ministerie-")).toBe(true);
  });

  test("the page starts with every group but the split ones, and far fewer rows than the list", () => {
    const initial = initialOrganizationRows(rows, groups);
    const split = new Set(groups.filter((group) => group.subgroups).map((group) => group.key));
    for (const row of initial) expect(split.has(row.b)).toBe(false);
    expect(initial.length).toBe(rows.filter((row) => !split.has(row.b)).length);
    expect(initial.length).toBeLessThan(rows.length / 4);
  });

  test("the dominant type of a group is the one most rows share", () => {
    expect(dominantSubtype([{ s: "a", n: "A", st: "zbo", b: "zelfstandig" }, { s: "b", n: "B", st: "zbo", b: "zelfstandig" }, { s: "c", n: "C", st: "rwt", b: "zelfstandig" }])).toBe("zbo");
    expect(dominantSubtype([{ s: "a", n: "A", st: "zbo", b: "zelfstandig" }, { s: "b", n: "B", st: "rwt", b: "zelfstandig" }])).toBeNull();
    expect(dominantSubtype([])).toBeNull();
  });

  test("an emblem is only linked from a local file, a logo only when it may be shown", () => {
    for (const row of rows) if (row.w) expect(row.w.startsWith("/media/wapens/")).toBe(true);
    const bySlug = new Map(getOrganizations().map((organization) => [organization.slug, organization]));
    for (const row of rows) {
      if (!row.lg) continue;
      const embed = bySlug.get(row.s)?.logoEmbed;
      expect(embed?.linkOnly).toBe(false);
      expect(row.lg).toBe(embed?.url);
      expect(row.lg.startsWith("https://")).toBe(true);
    }
  });
});
