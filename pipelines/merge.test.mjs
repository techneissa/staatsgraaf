import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { mergeDataset } from "./merge.mjs";

function envelope(letter, extra = {}) {
  return {
    workstream: letter,
    generatedAt: "2026-01-01T00:00:00Z",
    endpointsUsed: [],
    organizations: [],
    positions: [],
    people: [],
    tenures: [],
    memberships: [],
    relations: [],
    topics: [],
    budgets: [],
    sources: [],
    media: [],
    gaps: [],
    ...extra,
  };
}

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "nlgraph-merge-"));
  const researchDir = join(dir, "research");
  const dataDir = join(dir, "data");
  await mkdir(researchDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });
  return { dir, researchDir, dataDir, logPath: join(dir, "merge-log.entries.jsonl") };
}

async function writeEnvelope(researchDir, name, value) {
  await writeFile(join(researchDir, name), JSON.stringify(value), "utf8");
}

async function writeData(dataDir, file, value) {
  await writeFile(join(dataDir, file), JSON.stringify(value), "utf8");
}

async function readData(dataDir, file) {
  return JSON.parse(await readFile(join(dataDir, file), "utf8"));
}

async function readLog(logPath) {
  const raw = await readFile(logPath, "utf8");
  return raw.trim() === "" ? [] : raw.trim().split("\n").map((line) => JSON.parse(line));
}

function org(id, name, sources = []) {
  return { id, slug: id.replace(/^org:/, ""), name, type: "department", subtype: "zbo", branch: "zelfstandig", level: "rijk", country: "nederland", sources };
}

test("higher-tier record wins over a lower-tier record and over the seed base", async () => {
  const { researchDir, dataDir, logPath } = await setup();
  await writeEnvelope(researchDir, "A-news.json", envelope("A", {
    organizations: [org("org:test", "A-news", [{ source: "src:news", retrieved: "2026-01-01", confidence: "high" }])],
    sources: [{ id: "src:news", url: "https://news.example/story", title: "Nieuws", publisher: "NOS", type: "news", retrieved: "2026-01-01" }],
  }));
  await writeEnvelope(researchDir, "B-wet.json", envelope("B", {
    organizations: [org("org:test", "B-wet", [{ source: "src:wet", retrieved: "2026-01-01", confidence: "high" }])],
    sources: [{ id: "src:wet", url: "https://wetten.overheid.nl/BWBR0001840", title: "Grondwet", publisher: "Overheid.nl", type: "wet", retrieved: "2026-01-01" }],
  }));
  await writeData(dataDir, "organizations.json", [org("org:test", "base")]);

  const result = await mergeDataset({ researchDir, dataDir, logPath });
  const merged = await readData(dataDir, "organizations.json");
  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, "B-wet");
  assert.equal(result.stats.recordConflicts, 1);
  assert.equal(result.stats.baseOverrides, 1);
});

test("equal-tier conflict keeps the first workstream and logs a conflict line", async () => {
  const { researchDir, dataDir, logPath } = await setup();
  const govSource = { id: "src:gov", url: "https://www.rijksoverheid.nl/x", title: "Overheid", publisher: "Rijksoverheid", type: "page", retrieved: "2026-01-01" };
  await writeEnvelope(researchDir, "A-first.json", envelope("A", {
    organizations: [org("org:test", "A-first", [{ source: "src:gov", retrieved: "2026-01-01", confidence: "high" }])],
    sources: [govSource],
  }));
  await writeEnvelope(researchDir, "B-second.json", envelope("B", {
    organizations: [org("org:test", "B-second", [{ source: "src:gov", retrieved: "2026-01-01", confidence: "high" }])],
    sources: [govSource],
  }));

  const result = await mergeDataset({ researchDir, dataDir, logPath });
  const merged = await readData(dataDir, "organizations.json");
  assert.equal(merged[0].name, "A-first");
  const logs = await readLog(logPath);
  const conflicts = logs.filter((line) => line.kind === "record-conflict");
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].keptFrom, "A-first.json");
  assert.equal(conflicts[0].droppedFrom, "B-second.json");
  assert.equal(result.stats.recordConflicts, 1);
});

test("duplicate sources merge fields, keep the first retrieved date and the longest title", async () => {
  const { researchDir, dataDir, logPath } = await setup();
  await writeEnvelope(researchDir, "A-sources.json", envelope("A", {
    sources: [{ id: "src:s", url: "https://example.org/a", title: "Short", publisher: "Pub", type: "page", retrieved: "2026-01-01" }],
  }));
  await writeEnvelope(researchDir, "B-sources.json", envelope("B", {
    sources: [{ id: "src:s", url: "https://example.org/a", title: "A much longer title", publisher: "Pub", type: "page", retrieved: "2026-09-01", license: "CC0" }],
  }));

  await mergeDataset({ researchDir, dataDir, logPath });
  const sources = await readData(dataDir, "sources.json");
  assert.equal(sources.length, 1);
  assert.equal(sources[0].title, "A much longer title");
  assert.equal(sources[0].retrieved, "2026-01-01");
  assert.equal(sources[0].license, "CC0");
  const logs = await readLog(logPath);
  assert.ok(logs.some((line) => line.kind === "source-conflict" && line.field === "title"));
  assert.ok(logs.some((line) => line.kind === "source-conflict" && line.field === "retrieved"));
});

test("legalMappings inject by id and by subtype selector", async () => {
  const { researchDir, dataDir, logPath } = await setup();
  const sources = [
    { id: "src:l1", url: "https://wetten.overheid.nl/A", title: "Wet A", publisher: "Overheid.nl", type: "wet", retrieved: "2026-01-01" },
    { id: "src:l2", url: "https://wetten.overheid.nl/M", title: "Wet M", publisher: "Overheid.nl", type: "wet", retrieved: "2026-01-01" },
    { id: "src:l3", url: "https://wetten.overheid.nl/P", title: "Wet P", publisher: "Overheid.nl", type: "wet", retrieved: "2026-01-01" },
  ];
  await writeEnvelope(researchDir, "A-legal.json", envelope("A", {
    organizations: [org("org:a", "A"), { ...org("org:m", "M"), subtype: "ministerie" }],
    positions: [{ id: "pos:pa", slug: "pa", title: "Voorzitter", organization: "org:a", type: "commission", sources: [] }],
    sources,
    legalMappings: [
      { target: "org:a", legalSource: { label: "Wet A", url: "https://wetten.overheid.nl/A" }, sources: [{ source: "src:l1", retrieved: "2026-01-01", confidence: "high" }] },
      { target: "subtype:ministerie", legalSource: { label: "Wet M", url: "https://wetten.overheid.nl/M" }, sources: [{ source: "src:l2", retrieved: "2026-01-01", confidence: "high" }] },
      { target: "pos:pa", legalSource: { label: "Wet P", url: "https://wetten.overheid.nl/P" }, sources: [{ source: "src:l3", retrieved: "2026-01-01", confidence: "high" }] },
    ],
  }));

  await mergeDataset({ researchDir, dataDir, logPath });
  const orgs = await readData(dataDir, "organizations.json");
  const positions = await readData(dataDir, "positions.json");
  assert.equal(orgs.find((o) => o.id === "org:a").legalSource.label, "Wet A");
  assert.equal(orgs.find((o) => o.id === "org:m").legalSource.label, "Wet M");
  assert.equal(positions.find((p) => p.id === "pos:pa").legalBasis.label, "Wet P");
  assert.ok(orgs.find((o) => o.id === "org:a").sources.some((s) => s.source === "src:l1"));
});

test("aliases append without overwriting and collisions are logged", async () => {
  const { researchDir, dataDir, logPath } = await setup();
  await writeEnvelope(researchDir, "J-aliases.json", envelope("J", {
    people: [
      { id: "person:p", slug: "p", name: "Piet", aliases: ["Piet"], sources: [] },
      { id: "person:q", slug: "q", name: "Q", aliases: [], sources: [] },
    ],
    aliases: [
      { alias: "P.", target: "person:p" },
      { alias: "Piet", target: "person:p" },
      { alias: "Kamer", target: "person:p" },
      { alias: "Kamer", target: "person:q" },
    ],
  }));

  await mergeDataset({ researchDir, dataDir, logPath });
  const people = await readData(dataDir, "people.json");
  const piet = people.find((p) => p.id === "person:p");
  assert.deepEqual(piet.aliases, ["Piet", "P.", "Kamer"]);
  const logs = await readLog(logPath);
  assert.equal(logs.filter((line) => line.kind === "alias-collision").length, 1);
});

test("output arrays are sorted by id and empty research still yields valid arrays and meta", async () => {
  const { researchDir, dataDir, logPath } = await setup();
  await writeEnvelope(researchDir, "A-sort.json", envelope("A", {
    organizations: [org("org:z", "Z"), org("org:a", "A"), org("org:m", "M")],
    sources: [{ id: "src:s", url: "https://example.org/a", title: "T", publisher: "P", type: "page", retrieved: "2026-05-05" }],
  }));

  await mergeDataset({ researchDir, dataDir, logPath });
  const orgs = await readData(dataDir, "organizations.json");
  assert.deepEqual(orgs.map((o) => o.id), ["org:a", "org:m", "org:z"]);

  const empty = await setup();
  const result = await mergeDataset({ researchDir: empty.researchDir, dataDir: empty.dataDir, logPath: empty.logPath });
  assert.equal(result.files, 0);
  for (const file of ["organizations.json", "positions.json", "people.json", "tenures.json", "sources.json"]) {
    assert.deepEqual(await readData(empty.dataDir, file), []);
  }
  const meta = await readData(empty.dataDir, "meta.json");
  assert.equal(meta.datasetVersion, "v1");
  assert.equal(meta.sources.earliest, null);
  assert.ok(typeof meta.snapshotId === "string");
});
