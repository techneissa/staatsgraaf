import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { diffDatasets } from "./diff.mjs";

const src = (id = "src:s") => ({ source: id, retrieved: "2026-01-01", confidence: "high" });

function orgRecord(id, name, extra = {}) {
  return { id, slug: id.slice(4), name, type: "department", subtype: "zbo", branch: "zelfstandig", level: "rijk", country: "nederland", sources: [src("src:o")], ...extra };
}

function positionRecord(id, title, organization) {
  return { id, slug: id.slice(4), title, organization, type: "commission", sources: [src("src:p")] };
}

function personRecord(id, name) {
  return { id, slug: id.slice(6), name, aliases: [], sources: [src("src:per")] };
}

function tenureRecord(id, person, position, start, end = null, extra = {}) {
  return { id, person, position, seat: null, start, end, acting: false, entryMode: "benoemd", appointedBy: null, predecessor: null, successor: null, endReason: null, source: src("src:t"), ...extra };
}

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "nlgraph-diff-"));
  const previousDir = join(dir, "previous");
  const currentDir = join(dir, "current");
  await mkdir(previousDir, { recursive: true });
  await mkdir(currentDir, { recursive: true });
  return { dir, previousDir, currentDir, outPath: join(dir, "changes.json") };
}

async function writeDataset(dir, files) {
  for (const [file, value] of Object.entries(files)) {
    await writeFile(join(dir, file), JSON.stringify(value), "utf8");
  }
}

async function readChanges(outPath) {
  return JSON.parse(await readFile(outPath, "utf8"));
}

function basePeople() {
  return [personRecord("person:x", "Xavier")];
}

test("a tenure appearing is classified as an appointment", async () => {
  const { previousDir, currentDir, outPath } = await setup();
  const position = positionRecord("pos:p", "Minister", "org:o");
  await writeDataset(previousDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [position],
    "people.json": basePeople(),
    "tenures.json": [],
    "meta.json": { snapshotId: "2026-01-01" },
  });
  await writeDataset(currentDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [position],
    "people.json": basePeople(),
    "tenures.json": [tenureRecord("tenure:t1", "person:x", "pos:p", "2026-03-01")],
    "meta.json": { snapshotId: "2026-03-15" },
  });

  const result = await diffDatasets({ previousDir, currentDir, outPath });
  const appointments = result.changes.filter((c) => c.kind === "appointment");
  assert.equal(appointments.length, 1);
  assert.equal(appointments[0].date, "2026-03-01");
  assert.equal(appointments[0].position, "pos:p");
  assert.equal(appointments[0].organization, "org:o");
  assert.equal(appointments[0].in.tenure, "tenure:t1");
  assert.equal(appointments[0].source.source, "src:t");
});

test("a tenure with an end becomes a departure", async () => {
  const { previousDir, currentDir, outPath } = await setup();
  const position = positionRecord("pos:p", "Minister", "org:o");
  await writeDataset(previousDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [],
    "people.json": basePeople(),
    "tenures.json": [tenureRecord("tenure:t1", "person:x", "pos:p", "2026-01-01")],
    "meta.json": { snapshotId: "2026-01-01" },
  });
  await writeDataset(currentDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [],
    "people.json": basePeople(),
    "tenures.json": [tenureRecord("tenure:t1", "person:x", "pos:p", "2026-01-01", "2026-04-01", { endReason: "ontslag" })],
    "meta.json": { snapshotId: "2026-04-15" },
  });

  const result = await diffDatasets({ previousDir, currentDir, outPath });
  const departures = result.changes.filter((c) => c.kind === "departure");
  assert.equal(departures.length, 1);
  assert.equal(departures[0].date, "2026-04-01");
  assert.equal(departures[0].out.tenure, "tenure:t1");
  assert.match(departures[0].summary, /ontslag/);
});

test("a position that loses its last open tenure is a vacancy", async () => {
  const { previousDir, currentDir, outPath } = await setup();
  const position = positionRecord("pos:p", "Minister", "org:o");
  await writeDataset(previousDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [position],
    "people.json": basePeople(),
    "tenures.json": [tenureRecord("tenure:t1", "person:x", "pos:p", "2026-01-01")],
    "meta.json": { snapshotId: "2026-01-01" },
  });
  await writeDataset(currentDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [position],
    "people.json": basePeople(),
    "tenures.json": [],
    "meta.json": { snapshotId: "2026-05-01" },
  });

  const result = await diffDatasets({ previousDir, currentDir, outPath });
  const vacancies = result.changes.filter((c) => c.kind === "vacancy");
  assert.equal(vacancies.length, 1);
  assert.equal(vacancies[0].date, "2026-05-01");
  assert.equal(vacancies[0].organization, "org:o");
});

test("a position with a growing seat deficit is a vacancy", async () => {
  const { previousDir, currentDir, outPath } = await setup();
  const position = positionRecord("pos:college", "Gedeputeerde", "org:o");
  position.seatsCount = 5;
  const openSeats = (count) =>
    Array.from({ length: count }, (_, i) => tenureRecord(`tenure:t${i + 1}`, "person:x", "pos:college", "2026-01-01"));
  await writeDataset(previousDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [position],
    "people.json": basePeople(),
    "tenures.json": openSeats(4),
    "meta.json": { snapshotId: "2026-01-01" },
  });
  const currentTenures = openSeats(4);
  currentTenures[3] = tenureRecord("tenure:t4", "person:x", "pos:college", "2026-01-01", "2026-05-01");
  await writeDataset(currentDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [position],
    "people.json": basePeople(),
    "tenures.json": currentTenures,
    "meta.json": { snapshotId: "2026-05-15" },
  });

  const result = await diffDatasets({ previousDir, currentDir, outPath });
  const vacancies = result.changes.filter((c) => c.kind === "vacancy");
  assert.equal(vacancies.length, 1);
  assert.equal(vacancies[0].date, "2026-05-15");
  assert.equal(vacancies[0].out.label, "3 van 5 zetels vervuld");
  assert.equal(vacancies[0].in.label, "2 vacante zetels");
});

test("a position with no tenure in either snapshot is not called vacant", async () => {
  const { previousDir, currentDir, outPath } = await setup();
  const position = positionRecord("pos:empty", "Leeg college", "org:o");
  position.seatsCount = 5;
  await writeDataset(previousDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [position],
    "people.json": basePeople(),
    "tenures.json": [],
    "meta.json": { snapshotId: "2026-01-01" },
  });
  await writeDataset(currentDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [position],
    "people.json": basePeople(),
    "tenures.json": [],
    "meta.json": { snapshotId: "2026-05-15" },
  });

  const result = await diffDatasets({ previousDir, currentDir, outPath });
  assert.equal(result.changes.filter((c) => c.kind === "vacancy").length, 0);
});

test("a new organization is structural, and renames and moves are classified", async () => {
  const { previousDir, currentDir, outPath } = await setup();
  await writeDataset(previousDir, {
    "organizations.json": [
      orgRecord("org:o", "Oud", { parent: "org:p1" }),
      orgRecord("org:p1", "Parent een"),
    ],
    "positions.json": [],
    "people.json": [],
    "tenures.json": [],
    "meta.json": { snapshotId: "2026-01-01" },
  });
  await writeDataset(currentDir, {
    "organizations.json": [
      orgRecord("org:o", "Nieuw", { parent: "org:p2" }),
      orgRecord("org:p1", "Parent een"),
      orgRecord("org:p2", "Parent twee"),
      orgRecord("org:new", "Globale nieuwe organisatie"),
    ],
    "positions.json": [],
    "people.json": [],
    "tenures.json": [],
    "meta.json": { snapshotId: "2026-06-01" },
  });

  const result = await diffDatasets({ previousDir, currentDir, outPath });
  const kinds = result.changes.map((c) => c.kind);
  assert.ok(kinds.includes("structural"));
  assert.ok(kinds.includes("rename"));
  assert.ok(kinds.includes("move"));
  const rename = result.changes.find((c) => c.kind === "rename");
  assert.equal(rename.out.label, "Oud");
  assert.equal(rename.in.label, "Nieuw");
});

test("no previous snapshot writes [] and does not fabricate history", async () => {
  const { currentDir, outPath } = await setup();
  await writeDataset(currentDir, {
    "organizations.json": [orgRecord("org:new", "Globale nieuwe organisatie")],
    "positions.json": [],
    "people.json": [],
    "tenures.json": [],
    "meta.json": { snapshotId: "2026-06-01" },
  });

  const result = await diffDatasets({ previousDir: null, currentDir, outPath });
  assert.equal(result.noPrevious, true);
  assert.deepEqual(await readChanges(outPath), []);
});
