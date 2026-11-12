import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { RESULT_TYPES, buildElectionRecord, loadPartyKeys, parseDatabankPage, runElectionResults } from "./election-results.mjs";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const FIXTURE = readFileSync(new URL("./fixtures/election-results/tk-2025-10-29.html", import.meta.url), "utf8");
const STORED = JSON.parse(readFileSync(join(REPO_ROOT, "data", "elections.json"), "utf8")).find((election) => election.id === "election:tk-2025-10-29");
const TODAY = "2025-11-12";

/** The fixture with a change in its JSON (the textarea holds it HTML-escaped). */
function changedFixture(change) {
  const page = parseDatabankPage(FIXTURE);
  change(page);
  const text = JSON.stringify(page).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  return `<textarea id="UitslagData" class="hidden">${text}</textarea>`;
}

function httpFor(html) {
  const requested = [];
  return { requested, getText: async (url) => (requested.push(url), html) };
}

async function makeRoot({ elections = [] } = {}) {
  const root = await mkdtemp(join(tmpdir(), "election-results-"));
  await mkdir(join(root, "data"), { recursive: true });
  await writeFile(join(root, "data", "elections.json"), `${JSON.stringify(elections, null, 2)}\n`);
  await writeFile(join(root, "data", "sources.json"), "[]\n");
  return root;
}

const UPCOMING = [{ id: "upcoming:tk-last-2025-10-29", type: "tk", kind: "last", date: "2025-10-29" }];

test("the Kiesraad result of 29 October 2025 gives the record already in data/elections.json", async () => {
  const partyKeys = await loadPartyKeys(REPO_ROOT);
  const { record, problems } = buildElectionRecord({ type: RESULT_TYPES.tk, date: "2025-10-29", page: parseDatabankPage(FIXTURE), partyKeys, today: TODAY });
  assert.deepEqual(problems, []);
  const bySeat = (rows) => Object.fromEntries(rows.map((row) => [row.party, row]));
  assert.deepEqual(bySeat(record.seats), bySeat(STORED.seats));
  assert.equal(record.seatsTotal, 150);
  assert.equal(record.turnout, STORED.turnout);
  assert.equal(record.validVotes, STORED.validVotes);
});

test("with no recent election the check makes no request", async () => {
  const root = await makeRoot({ elections: [STORED] });
  const http = { getText: async () => assert.fail("no request expected") };
  const upcoming = [...UPCOMING, { id: "upcoming:ek-2027-05-24", type: "ek", kind: "next", date: "2027-05-24" }];
  const result = await runElectionResults({ root, http, today: TODAY, partyKeys: await loadPartyKeys(REPO_ROOT), upcoming, validate: false });
  assert.deepEqual(result, { requested: 0, added: [], gaps: [] });
});

test("a recent election without a record is fetched and written with its source", async () => {
  const root = await makeRoot();
  const http = httpFor(FIXTURE);
  const result = await runElectionResults({ root, http, today: TODAY, partyKeys: await loadPartyKeys(REPO_ROOT), upcoming: UPCOMING, validate: false });
  assert.deepEqual(result.added, ["election:tk-2025-10-29"]);
  assert.deepEqual(http.requested, ["https://www.verkiezingsuitslagen.nl/verkiezingen/detail/TK20251029"]);
  const written = JSON.parse(await readFile(join(root, "data", "elections.json"), "utf8"));
  assert.equal(written[0].seats.reduce((total, row) => total + row.seats, 0), 150);
  const sources = JSON.parse(await readFile(join(root, "data", "sources.json"), "utf8"));
  assert.equal(sources[0].id, written[0].source.source);
});

test("a result whose seats do not add up writes nothing", async () => {
  const root = await makeRoot();
  const broken = changedFixture((page) => {
    page.Stemregio.Partij[0].AantalZetels = "27";
  });
  const result = await runElectionResults({ root, http: httpFor(broken), today: TODAY, partyKeys: await loadPartyKeys(REPO_ROOT), upcoming: UPCOMING, validate: false });
  assert.deepEqual(result.added, []);
  assert.match(result.gaps[0].why, /tellen op tot 151, niet tot 150/);
  assert.equal(await readFile(join(root, "data", "elections.json"), "utf8"), "[]\n");
  assert.equal(await readFile(join(root, "data", "sources.json"), "utf8"), "[]\n");
});

test("a Tweede Kamer day is vervroegd unless it was announced as the regular day, which the state remembers", async () => {
  const run = async (state) => {
    const root = await makeRoot();
    await runElectionResults({ root, http: httpFor(FIXTURE), today: TODAY, partyKeys: await loadPartyKeys(REPO_ROOT), upcoming: UPCOMING, state, validate: false });
    return JSON.parse(await readFile(join(root, "data", "elections.json"), "utf8"))[0].kind;
  };
  assert.equal(await run({}), "vervroegd");
  // the weekly date run has already replaced the announcement; only the remembered date is left
  assert.equal(await run({ electionResults: { regular: [{ type: "tk", date: "2025-10-29" }] } }), "regulier");
});

test("a page with a null entry in its party list is a gap, not a crash", async () => {
  const root = await makeRoot();
  const broken = changedFixture((page) => {
    page.Stemregio.Partij.push(null);
  });
  const result = await runElectionResults({ root, http: httpFor(broken), today: TODAY, partyKeys: await loadPartyKeys(REPO_ROOT), upcoming: UPCOMING, validate: false });
  assert.deepEqual(result.added, []);
  assert.equal(result.gaps.length, 1);
});
