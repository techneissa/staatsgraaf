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
