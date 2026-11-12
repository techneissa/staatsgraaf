import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { OVERVIEW_URL, run } from "./budget.mjs";
import { BudgetGuardError } from "./budget-guard.mjs";
import { MINISTRIES } from "./budget-parse.mjs";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "budget");
const DOWNLOAD = "https://www.rijksfinancien.nl/sites/default/files/bestanden/open_data/Begrotingsstaten_2013-2027.json";
const NEXT_DOWNLOAD = DOWNLOAD.replace("2013-2027", "2013-2028");
const fixtureText = readFileSync(join(FIXTURES, "begrotingsstaten.json"), "utf8");
const quiet = () => {};

/** The download as the rijksfinancien host serves it: an overview page that links it, then the file. */
function host(url, body, calls = []) {
  return async (target, init = {}) => {
    calls.push(`${init.method ?? "GET"} ${target}`);
    if (target === OVERVIEW_URL) return new Response(`<a href="${url}">json</a>`, { status: 200 });
    if (target === url) return new Response(init.method === "HEAD" ? null : body, { status: 200, headers: { "content-length": String(Buffer.byteLength(body)) } });
    return new Response("niet gevonden", { status: 404 });
  };
}

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), "budget-"));
  copyFileSync(join(FIXTURES, "budgets-before.json"), join(dir, "budgets.json"));
  writeFileSync(join(dir, "sources.json"), readFileSync(join(FIXTURES, "sources-before.json")));
  return { dir, cache: join(dir, "cache"), read: (name) => readFileSync(join(dir, name), "utf8"), done: () => rmSync(dir, { recursive: true, force: true }) };
}

/** The fixture as a list of rows, edited, and written back as a table of columns. */
function edit(change) {
  const table = JSON.parse(fixtureText);
  const columns = Object.keys(table);
  let rows = Object.keys(table.VUO).map((i) => Object.fromEntries(columns.map((c) => [c, table[c][i]])));
  rows = change(rows);
  return JSON.stringify(Object.fromEntries(columns.map((c) => [c, Object.fromEntries(rows.map((row, i) => [String(i), row[c]]))])));
}

const options = (w, fetchImpl) => ({ dataDir: w.dir, cacheDir: w.cache, fetchImpl, now: () => new Date("2026-11-12T12:00:00Z"), log: quiet });

test("the current download writes data/budgets.json unchanged", async () => {
  const w = workspace();
  try {
    const before = w.read("budgets.json");
    const result = await run(options(w, host(DOWNLOAD, fixtureText)));
    assert.equal(result.status, "no-change");
    assert.equal(w.read("budgets.json"), before);
    assert.equal(w.read("sources.json"), readFileSync(join(FIXTURES, "sources-before.json"), "utf8"));
  } finally {
    w.done();
  }
});

test("a new fiscal year is added for every ministry", async () => {
  const w = workspace();
  try {
    const next = edit((rows) => [
      ...rows,
      ...rows.filter((row) => row.Begrotingsjaar === "2027").map((row) => ({ ...row, Begrotingsjaar: "2028", StandOWB: String(Math.round(Number(row.StandOWB) * 1.02)) })),
    ]);
    const before = JSON.parse(w.read("budgets.json"));
    const result = await run(options(w, host(NEXT_DOWNLOAD, next)));
    assert.equal(result.status, "updated");
    const after = JSON.parse(w.read("budgets.json"));
    const added = after.filter((record) => record.fiscalYear === 2028);
    assert.equal(added.length, MINISTRIES.length);
    assert.deepEqual(after.filter((record) => record.fiscalYear !== 2028), before);
    for (const record of added) {
      const prior = before.find((old) => old.organization === record.organization && old.fiscalYear === 2027);
      assert.deepEqual(record.previous, prior.current);
      assert.equal(record.sources[0].source, "src:rijksfinancien-begrotingsstaten-2013-2028");
    }
    const sources = JSON.parse(w.read("sources.json"));
    assert.ok(sources.some((source) => source.id === "src:rijksfinancien-begrotingsstaten-2013-2028" && source.url === NEXT_DOWNLOAD));
  } finally {
    w.done();
  }
});

test("a broken download writes nothing and stops with the guard", async () => {
  const broken = {
    "a ministry is missing": edit((rows) => rows.filter((row) => row.HoofdstukRomeins !== "VIII")),
    "amounts in euros instead of thousands": edit((rows) => rows.map((row) => ({ ...row, StandOWB: String(Number(row.StandOWB) * 1000), StandO1: String(Number(row.StandO1) * 1000), StandSBS: String(Number(row.StandSBS) * 1000), StandO2: String(Number(row.StandO2) * 1000), Realisatie: String(Number(row.Realisatie) * 1000) }))),
    "not a table": JSON.stringify({ error: "maintenance" }),
  };
  for (const [name, body] of Object.entries(broken)) {
    const w = workspace();
    try {
      const before = [w.read("budgets.json"), w.read("sources.json")];
      await assert.rejects(run(options(w, host(DOWNLOAD, body))), BudgetGuardError, name);
      assert.deepEqual([w.read("budgets.json"), w.read("sources.json")], before, name);
    } finally {
      w.done();
    }
  }
});

test("a second run reads no download when nothing changed", async () => {
  const w = workspace();
  try {
    await run(options(w, host(DOWNLOAD, fixtureText)));
    const calls = [];
    const later = { ...options(w, host(DOWNLOAD, fixtureText, calls)), now: () => new Date("2026-11-13T12:00:00Z"), };
    const result = await run(later);
    assert.equal(result.status, "unchanged");
    assert.ok(!calls.includes(`GET ${DOWNLOAD}`), "the file itself was not downloaded again");
    assert.equal((await run({ ...later, now: () => new Date("2026-11-13T13:00:00Z") })).status, "recent");
  } finally {
    w.done();
  }
});

test("a host that does not answer is a missed check, not a failed refresh", async () => {
  const w = workspace();
  try {
    const before = w.read("budgets.json");
    const failing = {
      "network error on HEAD": async (target, init = {}) => {
        if (target === OVERVIEW_URL) return new Response(`<a href="${DOWNLOAD}">json</a>`);
        throw new TypeError("fetch failed");
      },
      "error status on the file": async (target) => (target === OVERVIEW_URL ? new Response(`<a href="${DOWNLOAD}">json</a>`) : new Response("fout", { status: 503 })),
      "network error on GET": async (target, init = {}) => {
        if (target === OVERVIEW_URL) return new Response(`<a href="${DOWNLOAD}">json</a>`);
        if (init.method === "HEAD") return new Response(null, { status: 200, headers: { "content-length": "1" } });
        throw new Error("timeout");
      },
    };
    for (const [name, fetchImpl] of Object.entries(failing)) {
      const result = await run(options(w, fetchImpl));
      assert.equal(result.status, "unreachable", name);
      assert.equal(w.read("budgets.json"), before, name);
      assert.equal(existsSync(join(w.cache, "state.json")), false, `${name}: no state saved`);
    }
  } finally {
    w.done();
  }
});

test("a figure that was set and goes missing, or a chapter no rule claims, stops the guard", async () => {
  const broken = {
    "no revenue rows": edit((rows) => rows.filter((row) => row.VUO !== "O")),
    "no spending rows for a ministry": edit((rows) => rows.filter((row) => !(row.HoofdstukRomeins === "X" && row.VUO === "U"))),
    "a blank realised column": edit((rows) => rows.map((row) => (row.Begrotingsjaar === "2025" ? { ...row, Realisatie: "0" } : row))),
    "a chapter that no ministry has": edit((rows) => [...rows, { ...rows.find((row) => row.HoofdstukRomeins === "VII" && row.Begrotingsjaar === "2027"), HoofdstukRomeins: "XXIV", Hoofdstuknaam: "Nieuw Ministerie" }]),
  };
  for (const [name, body] of Object.entries(broken)) {
    const w = workspace();
    try {
      const before = w.read("budgets.json");
      await assert.rejects(run(options(w, host(DOWNLOAD, body))), BudgetGuardError, name);
      assert.equal(w.read("budgets.json"), before, name);
    } finally {
      w.done();
    }
  }
});

test("a record whose own figures did not change keeps its cross-check source", async () => {
  const w = workspace();
  try {
    // Change 2026 so that the 2027 record's `previous` moves while its own `current` stays.
    const body = edit((rows) =>
      rows.map((row) => (row.HoofdstukRomeins === "X" && row.Begrotingsjaar === "2026" && row.VUO === "U" && row.Artikelnummer === "2" ? { ...row, StandSBS: String(Number(row.StandSBS) + 1000) } : row)),
    );
    const result = await run(options(w, host(DOWNLOAD, body)));
    assert.equal(result.status, "updated");
    const after = JSON.parse(w.read("budgets.json"));
    const before = JSON.parse(readFileSync(join(FIXTURES, "budgets-before.json"), "utf8"));
    const org = "org:ministerie-van-defensie";
    const was = before.find((r) => r.organization === org && r.fiscalYear === 2027);
    const now = after.find((r) => r.organization === org && r.fiscalYear === 2027);
    assert.deepEqual(now.current, was.current);
    assert.notDeepEqual(now.previous, was.previous);
    assert.ok(now.sources.some((s) => s.source === "src:rijksfinancien-mjn-2027-bijlage-2"));
    assert.equal(now.sources.find((s) => s.source.startsWith("src:rijksfinancien-begrotingsstaten-")).retrieved, "2026-11-12");
  } finally {
    w.done();
  }
});
