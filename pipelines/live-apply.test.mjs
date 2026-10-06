import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { applyEnvelopeToData } from "./live-apply.mjs";

const REF = { source: "src:old", retrieved: "2026-09-17", confidence: "high" };

async function makeData(files) {
  const dir = await mkdtemp(join(tmpdir(), "live-apply-"));
  for (const [name, value] of Object.entries(files)) await writeFile(join(dir, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await writeFile(join(dir, "meta.json"), `${JSON.stringify({ datasetVersion: "v1", snapshotId: "2026-09-19" }, null, 2)}\n`, "utf8");
  return dir;
}

async function read(dir, name) {
  return JSON.parse(await readFile(join(dir, `${name}.json`), "utf8"));
}

test("new records are inserted, closed records replace open ones, unchanged records are left alone", async () => {
  const open = { id: "tenure:a", person: "person:a", position: "pos:a", start: "2025-01-01", end: null, source: REF };
  const dir = await makeData({
    people: [{ id: "person:a", slug: "a", name: "A", description: "Blijft staan.", sources: [REF] }],
    tenures: [open, { id: "tenure:b", person: "person:b", position: "pos:b", start: "2024-01-01", end: null, source: REF }],
    memberships: [],
    positions: [],
    relations: [],
    sources: [{ id: "src:old", url: "https://example.org/old", title: "Oud", publisher: "X", type: "api", retrieved: "2026-09-17", license: "CC0-1.0" }],
  });
  const newSource = { id: "src:new", url: "https://example.org/new", title: "Nieuw", publisher: "Y", type: "api", retrieved: "2026-10-05", license: "CC0-1.0", published: null, archiveUrl: null, notes: null };
  const envelope = {
    people: [{ id: "person:a", slug: "a", name: "A", sources: [REF, { source: "src:new", retrieved: "2026-10-05", confidence: "high" }] }],
    tenures: [
      { ...open, end: "2026-09-30", source: { source: "src:new", retrieved: "2026-10-05", confidence: "high" } },
      { id: "tenure:b", person: "person:b", position: "pos:b", start: "2024-01-01", end: null, source: { source: "src:new", retrieved: "2026-10-05", confidence: "high" } },
      { id: "tenure:c", person: "person:a", position: "pos:c", start: null, end: null, source: REF },
    ],
    sources: [newSource, { id: "src:old", url: "https://example.org/old", retrieved: "2026-10-05" }],
  };
  const result = await applyEnvelopeToData({ dataDir: dir, envelope, now: new Date("2026-10-05T12:00:00Z") });
  const tenures = await read(dir, "tenures");
  assert.equal(tenures.find((t) => t.id === "tenure:a").end, "2026-09-30");
  assert.deepEqual(tenures.find((t) => t.id === "tenure:b").source, REF, "an identical record keeps its old source reference");
  assert.equal(tenures.find((t) => t.id === "tenure:c").start, null);
  const people = await read(dir, "people");
  assert.equal(people[0].description, "Blijft staan.");
  assert.equal(people[0].sources.length, 2, "a person whose tenure changed gains the source reference");
  const sources = await read(dir, "sources");
  assert.equal(sources.find((s) => s.id === "src:old").retrieved, "2026-10-05");
  assert.equal(sources.find((s) => s.id === "src:new").license, "CC0-1.0");
  assert.deepEqual(result.counts.tenures, { added: 1, updated: 1, unchanged: 1 });
  assert.deepEqual(result.changedFiles, ["people", "sources", "tenures"]);
  const meta = await read(dir, "meta");
  assert.equal(meta.snapshotId, "2026-10-05");
});

test("a person with no changed tenure or membership keeps their source references as they are", async () => {
  const dir = await makeData({
    people: [{ id: "person:z", slug: "z", name: "Z", sources: [REF] }],
    tenures: [{ id: "tenure:z", person: "person:z", position: "pos:z", start: "2024-01-01", end: null, source: REF }],
    memberships: [],
    positions: [],
    relations: [],
    sources: [],
  });
  const envelope = {
    people: [{ id: "person:z", slug: "z", name: "Z", sources: [REF, { source: "src:new", retrieved: "2026-10-05", confidence: "high" }] }],
    tenures: [{ id: "tenure:z", person: "person:z", position: "pos:z", start: "2024-01-01", end: null, source: { source: "src:new", retrieved: "2026-10-05", confidence: "high" } }],
  };
  const result = await applyEnvelopeToData({ dataDir: dir, envelope });
  assert.deepEqual(result.changedFiles, []);
  assert.equal((await read(dir, "people"))[0].sources.length, 1);
});

test("applying the same envelope twice changes nothing the second time", async () => {
  const dir = await makeData({ people: [], tenures: [], memberships: [], positions: [], relations: [], sources: [] });
  const envelope = {
    tenures: [{ id: "tenure:c", person: "person:a", position: "pos:c", start: "2026-01-01", end: null, source: REF }],
    sources: [{ id: "src:new", url: "https://example.org/new", title: "N", publisher: "Y", type: "api", retrieved: "2026-10-05", license: "CC0-1.0" }],
  };
  await applyEnvelopeToData({ dataDir: dir, envelope });
  const again = await applyEnvelopeToData({ dataDir: dir, envelope });
  assert.deepEqual(again.changedFiles, []);
});

test("organisations, seats and relations: a new one is inserted, an existing one changes only the fields the live sources own", async () => {
  const dir = await makeData({
    people: [],
    tenures: [{ id: "tenure:a", person: "person:a", position: "pos:a", start: "2020-01-01", end: null, source: REF }],
    memberships: [],
    organizations: [{ id: "org:x", slug: "x", name: "Gemeente X", aliases: ["X"], description: "Blijft staan.", website: "https://x.nl", established: null, seatsCount: 19, sources: [REF] }],
    positions: [{ id: "pos:raad-x", slug: "raad-x", title: "Lid raad", seatsCount: 19, sources: [REF] }],
    relations: [{ id: "rel:elects-x", from: "org:a", to: "org:x", type: "elects", seatsAppointed: 19, source: REF }],
    sources: [],
  });
  const live = { source: "src:live", retrieved: "2026-10-06", confidence: "high" };
  const envelope = {
    organizations: [
      { id: "org:x", slug: "x", name: "Gemeente Ex", aliases: ["X", "Gemeente X"], description: "Mag niet overschreven worden.", website: "https://anders.nl", established: "1998-01-01", seatsCount: 21, sources: [REF, live] },
      { id: "org:nieuw", slug: "nieuw", name: "Gemeente Nieuw", sources: [live] },
    ],
    positions: [{ id: "pos:raad-x", slug: "raad-x", title: "Andere titel", seatsCount: 21, sources: [live] }],
    relations: [{ id: "rel:elects-x", from: "org:a", to: "org:x", type: "elects", seatsAppointed: 21, source: live }],
  };
  const result = await applyEnvelopeToData({ dataDir: dir, envelope, now: new Date("2026-10-06T12:00:00Z") });
  const orgs = await read(dir, "organizations");
  const x = orgs.find((org) => org.id === "org:x");
  assert.equal(x.name, "Gemeente Ex");
  assert.equal(x.seatsCount, 21);
  assert.equal(x.established, "1998-01-01");
  assert.equal(x.website, "https://anders.nl");
  assert.equal(x.description, "Blijft staan.", "a field the live sources do not own is left alone");
  assert.deepEqual(x.sources.map((ref) => ref.source), ["src:old", "src:live"]);
  assert.ok(orgs.some((org) => org.id === "org:nieuw"));
  const positions = await read(dir, "positions");
  assert.equal(positions[0].seatsCount, 21);
  assert.equal(positions[0].title, "Lid raad");
  assert.equal((await read(dir, "relations"))[0].seatsAppointed, 21);
  assert.deepEqual(result.counts.organizations, { added: 1, updated: 1, unchanged: 0 });
  // the same envelope again changes nothing
  const again = await applyEnvelopeToData({ dataDir: dir, envelope, now: new Date("2026-10-06T12:00:00Z") });
  assert.deepEqual(again.changedFiles, []);
});

test("a tenure whose only change is the source is rewritten when it is named in sourceUpgrades, and not otherwise", async () => {
  const open = { id: "tenure:a", person: "person:a", position: "pos:a", start: "2020-01-01", end: null, source: REF };
  const dir = await makeData({ people: [{ id: "person:a", slug: "a", name: "A", sources: [REF] }], tenures: [open], memberships: [], positions: [], relations: [], sources: [] });
  const live = { source: "src:live", retrieved: "2026-10-06", confidence: "high" };
  const envelope = { people: [{ id: "person:a", slug: "a", name: "A", sources: [REF, live] }], tenures: [{ ...open, source: live }] };
  const plain = await applyEnvelopeToData({ dataDir: dir, envelope, now: new Date("2026-10-06T12:00:00Z") });
  assert.deepEqual(plain.changedFiles, []);
  const upgraded = await applyEnvelopeToData({ dataDir: dir, envelope, now: new Date("2026-10-06T12:00:00Z"), sourceUpgrades: new Set(["tenure:a"]) });
  assert.deepEqual(upgraded.changedFiles, ["people", "tenures"]);
  assert.equal((await read(dir, "tenures"))[0].source.source, "src:live");
  assert.equal((await read(dir, "people"))[0].sources.length, 2);
});
