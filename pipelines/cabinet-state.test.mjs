import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseCabinetStatement, planCoalitionChanges } from "./cabinet-state.mjs";
import { applyEnvelopeToData } from "./live-apply.mjs";
import { planRefresh, splitActingRoles } from "./refresh-official.mjs";

const TODAY = "2026-11-12";
const OLD = { source: "src:old", retrieved: "2026-10-01", confidence: "high" };

function page(name) {
  return readFileSync(new URL(`./fixtures/live/${name}`, import.meta.url), "utf8");
}

// The real kabinet-Jetten page, with the sentence the cabinet-Schoof page uses for a party that leaves.
const VVD_EXIT = "Op 10 november 2026 boden de bewindspersonen van de VVD hun ontslag aan de Koning aan. De minister-president en de overige ministers en staatssecretarissen stelden hun functie ter beschikking.";
const JETTEN_AFTER_EXIT = page("rijksoverheid-kabinet-jetten.html").replaceAll("Op 23 februari 2026 was de beëdiging van het kabinet-Jetten.", `Op 23 februari 2026 was de beëdiging van het kabinet-Jetten. ${VVD_EXIT}`);

const JETTEN = {
  id: "coalition:kabinet-jetten",
  government: "org:regering",
  name: "Kabinet-Jetten",
  parties: ["D66", "VVD", "CDA"],
  start: "2026-02-23",
  end: null,
  demissionairSince: null,
  primeMinister: null,
  agreement: null,
  kind: "minderheid",
  notes: null,
  source: { source: "src:rijksoverheid-kabinet-jetten", retrieved: "2026-09-19", confidence: "high" },
};

// 28 bewindspersonen: 0-9 D66, 10-18 VVD, 19-27 CDA, one minister each.
function cabinetDataset() {
  const party = (index) => (index < 10 ? "D66" : index < 19 ? "VVD" : "CDA");
  const positions = Array.from({ length: 28 }, (_, i) => ({ id: `pos:minister-van-test-${i}`, slug: `minister-van-test-${i}`, title: `Minister van Test ${i}`, organization: `org:ministerie-test-${i}` }));
  return {
    organizations: positions.map((position) => ({ id: position.organization, level: "rijk", country: "nederland" })),
    positions,
    people: positions.map((_, i) => ({ id: `person:persoon-${i}`, slug: `persoon-${i}`, name: `Persoon ${i}`, party: party(i), sources: [OLD] })),
    tenures: positions.map((_, i) => ({ id: `tenure:test-${i}`, person: `person:persoon-${i}`, position: `pos:minister-van-test-${i}`, start: "2026-02-23", end: null, acting: false, source: OLD })),
    memberships: [],
    relations: [],
    sources: [{ id: "src:rijksoverheid-kabinet-jetten" }],
    elections: [],
    coalitions: [structuredClone(JETTEN)],
  };
}

const card = (name, role) => ({ slug: name.toLowerCase().replace(/\W+/g, "-"), name, role, url: `https://www.rijksoverheid.nl/regering/bewindspersonen/${name.toLowerCase().replace(/\W+/g, "-")}` });

/** The page after the VVD left: persoon-19 and persoon-20 (CDA) hold two VVD posts ad interim, two new people take two more. */
function listAfterVvdExit() {
  const kept = Array.from({ length: 28 }, (_, i) => i).filter((i) => i < 10 || i > 18);
  const items = kept.map((i) => card(`Persoon ${i}`, `Minister van Test ${i}${i === 19 ? ", Minister van Test 10 a.i." : i === 20 ? ", Minister van Test 11 a.i." : ""}`));
  items.push(card("Nieuw Een", "Minister van Test 12"), card("Nieuw Twee", "Minister van Test 13"));
  return items;
}

function fetched(items, statementHtml) {
  const statement = statementHtml ? parseCabinetStatement(statementHtml) : null;
  return {
    generatedAt: `${TODAY}T00:00:00.000Z`,
    endpointsUsed: [],
    gaps: [],
    rawFiles: [],
    bodies: {
      bewindspersonen: { ok: true, status: 200, url: "https://www.rijksoverheid.nl/regering/bewindspersonen", items, cabinet: { slug: "kabinet-jetten", name: null }, cabinetState: { slug: "kabinet-jetten", statement } },
      tweedeKamer: { ok: true, skipped: true, items: [] },
      eersteKamer: { ok: true, skipped: true, items: [] },
    },
  };
}

const state = { bewindspersonen: { cabinetSlug: "kabinet-jetten" } };

test("the real cabinet pages: party exits and a fallen cabinet are read, a sitting cabinet has no statement", () => {
  assert.deepEqual(parseCabinetStatement(page("rijksoverheid-kabinet-jetten.html")), { sworn: "2026-02-23", events: [] });
  const schoof = parseCabinetStatement(page("rijksoverheid-kabinet-schoof.html"));
  assert.deepEqual(schoof.events, [
    { kind: "party-exit", date: "2025-06-03", parties: ["PVV"], demissionair: true },
    { kind: "party-exit", date: "2025-08-22", parties: ["NSC"], demissionair: false },
  ]);
  assert.deepEqual(parseCabinetStatement(page("rijksoverheid-kabinet-rutte-iv.html")).events, [{ kind: "cabinet-resigned", date: "2023-07-07" }]);
  // What data/coalitions.json already records for the cabinet-Schoof is not written again.
  const coalitions = JSON.parse(readFileSync(new URL("../data/coalitions.json", import.meta.url), "utf8"));
  assert.deepEqual(planCoalitionChanges({ slug: "kabinet-schoof", events: schoof.events, coalitions, sources: [{ id: "src:rijksoverheid-kabinet-schoof" }], today: TODAY }), { upserts: [], drafts: [] });
});

test("a whole party leaves, posts go to others ad interim: the guard passes, the right tenures close and open, the cabinet changes", async () => {
  const dataset = cabinetDataset();
  const plan = await planRefresh({ fetched: fetched(listAfterVvdExit(), JETTEN_AFTER_EXIT), dataset, today: TODAY, state });
  assert.deepEqual(plan.stopped, []);
  assert.deepEqual(plan.closures.map((entry) => entry.record.person).sort(), Array.from({ length: 9 }, (_, i) => `person:persoon-${i + 10}`).sort());
  const opened = plan.openings.map((entry) => `${entry.record.person}|${entry.record.position}|${entry.record.acting}`).sort();
  assert.ok(opened.includes("person:persoon-19|pos:minister-van-test-10|true"));
  assert.ok(opened.includes("person:persoon-20|pos:minister-van-test-11|true"));
  assert.equal(opened.filter((entry) => entry.endsWith("|false")).length, 2, "the two new ministers");
  // The official statement writes the new cabinet state: Kabinet-Jetten ends, a romp cabinet of the remaining parties starts, both demissionair.
  const byId = new Map(plan.envelope.coalitions.map((record) => [record.id, record]));
  assert.equal(byId.get("coalition:kabinet-jetten").end, "2026-11-10");
  assert.equal(byId.get("coalition:kabinet-jetten").demissionairSince, "2026-11-10");
  const romp = byId.get("coalition:kabinet-jetten-romp-i");
  assert.deepEqual([romp.parties, romp.start, romp.end, romp.demissionairSince, romp.kind], [["D66", "CDA"], "2026-11-10", null, "2026-11-10", "rompkabinet"]);
  assert.deepEqual(plan.opsDrafts, []);
});

test("the same ministers gone without a statement: no cabinet change is written, the [ops] text with the exact change is drafted", async () => {
  const dataset = cabinetDataset();
  const plan = await planRefresh({ fetched: fetched(listAfterVvdExit(), null), dataset, today: TODAY, state });
  assert.equal(plan.stopped.length, 1);
  assert.equal(plan.stopped[0].source, "bewindspersonen");
  assert.equal(plan.closures.length, 0);
  assert.equal(plan.envelope.coalitions, undefined);
  assert.equal(plan.opsDrafts.length, 1);
  assert.match(plan.opsDrafts[0], /9 bewindspersonen van VVD/);
  assert.match(plan.opsDrafts[0], /"id": "coalition:kabinet-jetten-romp-i"/);
  assert.match(plan.opsDrafts[0], /"parties": \[\s*"D66",\s*"CDA"\s*\]/);
});

test("a half-loaded page (5 people, no party pattern) is still stopped, even with an exit statement on the cabinet page", async () => {
  const dataset = cabinetDataset();
  const items = [0, 1, 11, 20, 25].map((i) => card(`Persoon ${i}`, `Minister van Test ${i}`));
  for (const statementHtml of [null, JETTEN_AFTER_EXIT]) {
    const plan = await planRefresh({ fetched: fetched(items, statementHtml), dataset, today: TODAY, state });
    assert.equal(plan.stopped.length, 1);
    assert.match(plan.stopped[0].reasons[0], /list-size/);
    assert.equal(plan.closures.length, 0);
    assert.equal(plan.opsDrafts.length, 0, "no party leaves here, so nothing to propose");
  }
});

test("posts taken over ad interim are told apart from the own role", () => {
  assert.deepEqual(splitActingRoles("Minister van Financiën, Minister van Defensie a.i."), { role: "Minister van Financiën", acting: ["Minister van Defensie"] });
  assert.deepEqual(splitActingRoles("Minister van Defensie, 1e viceminister-president"), { role: "Minister van Defensie, 1e viceminister-president", acting: [] });
});

test("the live apply inserts the romp cabinet and patches only end and demissionairSince of the old one", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cabinet-state-"));
  await writeFile(join(dir, "coalitions.json"), `${JSON.stringify([JETTEN], null, 2)}\n`, "utf8");
  const { upserts } = planCoalitionChanges({
    slug: "kabinet-jetten",
    events: parseCabinetStatement(JETTEN_AFTER_EXIT).events,
    coalitions: [JETTEN],
    sources: [{ id: "src:rijksoverheid-kabinet-jetten" }],
    today: TODAY,
  });
  const patched = upserts.map((record) => (record.id === JETTEN.id ? { ...record, name: "Niet overnemen" } : record));
  const applied = await applyEnvelopeToData({ dataDir: dir, envelope: { coalitions: patched }, now: new Date(`${TODAY}T10:00:00Z`) });
  assert.deepEqual(applied.counts.coalitions, { added: 1, updated: 1, unchanged: 0 });
  const written = JSON.parse(await readFile(join(dir, "coalitions.json"), "utf8"));
  const old = written.find((record) => record.id === JETTEN.id);
  assert.deepEqual([old.name, old.end, old.demissionairSince], ["Kabinet-Jetten", "2026-11-10", "2026-11-10"]);
  assert.equal(written.length, 2);
});
