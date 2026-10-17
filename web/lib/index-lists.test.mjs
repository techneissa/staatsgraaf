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
  parsePositionSortDir,
  parsePositionSortKey,
  parsePositionWrap,
  positionDisplayRest,
  positionFamily,
  positionSearchText,
  positionSections,
  searchTerms,
  sortPositionRows,
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
    expect(organizationSearchText({ s: "a", n: "Tweede Kamer", ge: "House of Representatives", st: "tweede-kamer", t: "elected", b: "staten-generaal" })).toContain("representatives");
    expect(positionSearchText({ s: "a", n: "Minister van Financiën", ge: "Minister of Finance", t: "dept_head", o: "Ministerie van Financiën", oe: "Ministry of Finance", b: "regering" })).toContain("finance");
    expect(positionSearchText({ s: "a", n: "Minister van Financiën", ge: "Minister of Finance", t: "dept_head", o: "Ministerie van Financiën", oe: "Ministry of Finance", b: "regering" })).toContain("ministry");
  });

  test("a position also matches on a current holder", () => {
    expect(positionSearchText({ s: "a", n: "Minister-president", t: "dept_head", h: "Ada Test" })).toContain("ada");
  });
});

describe("position families", () => {
  test("a shared stem keeps the distinctive rest", () => {
    expect(positionFamily("Burgemeester van Amsterdam")).toEqual({
      key: "burgemeester",
      label: { nl: "Burgemeester", en: "Mayor" },
      rest: "Amsterdam",
    });
    expect(positionFamily("Fractievoorzitter BBB")?.rest).toBe("BBB");
    expect(positionFamily("Minister van Financiën")?.rest).toBe("Financiën");
    expect(positionFamily("Koning der Nederlanden")).toBeNull();
  });

  test("stems of four matches become a section; smaller stems keep the full title", () => {
    const burgemeesters = ["Aa en Hunze", "Aalsmeer", "Aalten", "Achtkarspelen"].map((place, index) => ({
      s: `b-${index}`,
      n: `Burgemeester van ${place}`,
      t: "dept_head",
    }));
    const unique = { s: "king", n: "Koning der Nederlanden", t: "dept_head" };
    const few = ["BBB", "CDA"].map((party, index) => ({ s: `f-${index}`, n: `Fractievoorzitter ${party}`, t: "elected" }));
    const sections = positionSections([...burgemeesters, unique, ...few], 4);
    const family = sections.find((section) => section.family?.key === "burgemeester");
    expect(family?.items.map((item) => item.label)).toEqual(["Aa en Hunze", "Aalsmeer", "Aalten", "Achtkarspelen"]);
    const leftoverHeads = sections.find((section) => section.key === "dept_head");
    expect(leftoverHeads?.items.map((item) => item.label)).toEqual(["Koning der Nederlanden"]);
    const leftoverElected = sections.find((section) => section.key === "elected");
    expect(leftoverElected?.items.map((item) => item.label)).toEqual(["Fractievoorzitter BBB", "Fractievoorzitter CDA"]);
  });

  test("a bare office stem takes its rest from the body name", () => {
    expect(positionDisplayRest("Wethouder", "College van burgemeester en wethouders van Aa en Hunze")).toBe("Aa en Hunze");
    expect(positionDisplayRest("Gedeputeerde", "Gedeputeerde Staten van Drenthe")).toBe("Drenthe");
    expect(positionDisplayRest("Secretaris-generaal", "Ministerie van Financiën")).toBe("Financiën");
    expect(positionDisplayRest("Burgemeester van Amsterdam", "Gemeente Amsterdam")).toBeNull();
    expect(positionDisplayRest("Wethouder", "Tweede Kamer")).toBeNull();
    expect(positionDisplayRest("Wethouder", null)).toBeNull();
  });
});

describe("position sort", () => {
  const rows = [
    { s: "utrecht", n: "Burgemeester van Utrecht", t: "dept_head", o: "Gemeente Utrecht", h: "Sharon Dijksma" },
    { s: "financien", n: "Minister van Financiën", t: "dept_head", o: "Ministerie van Financiën", h: "Eelco Heinen" },
    { s: "koning", n: "Koning der Nederlanden", t: "dept_head", o: "Koninklijk Huis" },
  ];

  test("unknown keys fall back to title, ascending", () => {
    expect(parsePositionSortKey("nope")).toBe("title");
    expect(parsePositionSortDir("")).toBe("asc");
    expect(parsePositionSortDir("desc")).toBe("desc");
    expect(parsePositionWrap("")).toBe(true);
    expect(parsePositionWrap("0")).toBe(false);
  });

  test("title sort is alphabetical, and a missing holder sits last in both directions", () => {
    expect(sortPositionRows(rows, "title", "asc").map((row) => row.s)).toEqual(["utrecht", "koning", "financien"]);
    expect(sortPositionRows(rows, "holder", "asc").map((row) => row.s)).toEqual(["financien", "utrecht", "koning"]);
    expect(sortPositionRows(rows, "holder", "desc").map((row) => row.s)).toEqual(["utrecht", "financien", "koning"]);
    expect(sortPositionRows(rows, "org", "asc").map((row) => row.s)).toEqual(["utrecht", "koning", "financien"]);
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
    expect(positions.rows.some((row) => typeof row.h === "string" && row.h.length > 0)).toBe(true);
    expect(positions.rows.every((row) => row.hc == null || (row.h != null && row.hc > 0))).toBe(true);
    const bare = positions.rows.filter((row) => row.n === "Wethouder" || row.n === "Gedeputeerde" || row.n === "Secretaris-generaal");
    expect(bare.length).toBeGreaterThan(4);
    expect(bare.every((row) => positionDisplayRest(row.n, row.o) != null)).toBe(true);
    const minister = positions.rows.find((row) => row.s === "minister-van-financien");
    expect(minister?.ge).toBe("Minister of Finance");
    expect(minister?.oe).toBe("Ministry of Finance");
    const mayor = positions.rows.find((row) => row.s === "burgemeester-amsterdam");
    expect(mayor?.ge).toBe("Mayor of Amsterdam");
    expect(mayor?.oe).toBe("Municipality of Amsterdam");
    const director = positions.rows.find(
      (row) => row.s === "agentschap-college-ter-beoordeling-van-geneesmiddelen-algemeendirecteur",
    );
    expect(director?.ge).toBe("Director, Medicines Evaluation Board");
    expect(director?.oe).toBe("Medicines Evaluation Board");
    const board = positions.rows.find((row) => row.s === "zbo-autoriteit-consument-en-markt-bestuurslid");
    expect(board?.ge).toBe("Board member, Authority for Consumers and Markets");
    expect(board?.oe).toBe("Authority for Consumers and Markets");
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

  test("an emblem is only linked from a local file, and the index loads no third-party logo", () => {
    for (const row of rows) if (row.w) expect(row.w.startsWith("/media/wapens/")).toBe(true);
    for (const row of rows) expect(JSON.stringify(row)).not.toContain("https://");
  });
});
