import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { deriveChanges, writeChanges } from "./changes.mjs";

const src = (id = "src:s") => ({ source: id, retrieved: "2026-01-01", confidence: "high" });

function orgRecord(id, name, extra = {}) {
  return {
    id,
    slug: id.slice(4),
    name,
    type: "department",
    subtype: "zbo",
    branch: "zelfstandig",
    level: "rijk",
    country: "nederland",
    sources: [src("src:o")],
    ...extra,
  };
}

function positionRecord(id, title, organization, extra = {}) {
  return {
    id,
    slug: id.slice(4),
    title,
    organization,
    type: "commission",
    seatsCount: 1,
    sources: [src("src:p")],
    ...extra,
  };
}

function personRecord(id, name) {
  return { id, slug: id.slice(6), name, aliases: [], sources: [src("src:per")] };
}

function tenureRecord(id, person, position, start, end = null, extra = {}) {
  return {
    id,
    person,
    position,
    seat: null,
    start,
    end,
    acting: false,
    entryMode: "benoemd",
    appointedBy: null,
    predecessor: null,
    successor: null,
    endReason: null,
    source: src("src:t"),
    ...extra,
  };
}

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "nlgraph-changes-"));
  const dataDir = join(dir, "data");
  await mkdir(dataDir, { recursive: true });
  return { dir, dataDir, outPath: join(dir, "changes.json") };
}

async function writeDataset(dir, files) {
  for (const [file, value] of Object.entries(files)) {
    await writeFile(join(dir, file), JSON.stringify(value), "utf8");
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function basePeople() {
  return [personRecord("person:x", "Xavier"), personRecord("person:y", "Yvonne")];
}

test("a tenure with a start is derived as an appointment", async () => {
  const { dataDir } = await setup();
  const position = positionRecord("pos:p", "Minister", "org:o");
  await writeDataset(dataDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [position],
    "people.json": basePeople(),
    "tenures.json": [tenureRecord("tenure:t1", "person:x", "pos:p", "2026-03-01")],
    "meta.json": { snapshotId: "2026-09-18" },
  });

  const result = await deriveChanges({ dataDir, snapshotDate: "2026-09-18" });
  const appointments = result.changes.filter((c) => c.kind === "appointment");
  assert.equal(appointments.length, 1);
  assert.equal(appointments[0].date, "2026-03-01");
  assert.equal(appointments[0].position, "pos:p");
  assert.equal(appointments[0].organization, "org:o");
  assert.equal(appointments[0].in.tenure, "tenure:t1");
  assert.equal(appointments[0].in.person, "person:x");
  assert.equal(appointments[0].out.tenure, null);
  assert.equal(appointments[0].out.label, "Geen voorganger bekend");
  assert.equal(appointments[0].source.source, "src:t");
  assert.match(appointments[0].id, /^change:2026-03-01-appointment-/);
});

test("an acting appointment is still an appointment and says waarnemend", async () => {
  const { dataDir } = await setup();
  await writeDataset(dataDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [positionRecord("pos:p", "Minister", "org:o")],
    "people.json": basePeople(),
    "tenures.json": [tenureRecord("tenure:t1", "person:x", "pos:p", "2026-03-01", null, { acting: true })],
    "meta.json": { snapshotId: "2026-09-18" },
  });

  const result = await deriveChanges({ dataDir });
  const appointment = result.changes.find((c) => c.kind === "appointment");
  assert.ok(appointment);
  assert.match(appointment.summary, /Waarnemend benoemd/);
});

test("a tenure with an end is derived as a departure with its successor", async () => {
  const { dataDir } = await setup();
  const position = positionRecord("pos:p", "Minister", "org:o");
  await writeDataset(dataDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [position],
    "people.json": basePeople(),
    "tenures.json": [
      tenureRecord("tenure:t1", "person:x", "pos:p", "2024-01-01", "2026-04-01", {
        endReason: "ontslag",
        successor: "tenure:t2",
      }),
      tenureRecord("tenure:t2", "person:y", "pos:p", "2026-04-02", null, { predecessor: "tenure:t1" }),
    ],
    "meta.json": { snapshotId: "2026-09-18" },
  });

  const result = await deriveChanges({ dataDir });
  const departures = result.changes.filter((c) => c.kind === "departure");
  assert.equal(departures.length, 1);
  assert.equal(departures[0].date, "2026-04-01");
  assert.equal(departures[0].out.tenure, "tenure:t1");
  assert.equal(departures[0].in.tenure, "tenure:t2");
  assert.match(departures[0].summary, /ontslagen/);
});

test("a departure with no successor chain falls back to the named gap", async () => {
  const { dataDir } = await setup();
  await writeDataset(dataDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [positionRecord("pos:p", "Minister", "org:o")],
    "people.json": basePeople(),
    "tenures.json": [tenureRecord("tenure:t1", "person:x", "pos:p", "2024-01-01", "2026-04-01")],
    "meta.json": { snapshotId: "2026-09-18" },
  });

  const result = await deriveChanges({ dataDir });
  const departure = result.changes.find((c) => c.kind === "departure");
  assert.equal(departure.in.tenure, null);
  assert.equal(departure.in.label, "Geen opvolger bekend");
});

test("a tracked position with a seat deficit is derived as a vacancy", async () => {
  const { dataDir } = await setup();
  const position = positionRecord("pos:college", "Lid College", "org:o", { seatsCount: 3 });
  await writeDataset(dataDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [position],
    "people.json": basePeople(),
    "tenures.json": [
      tenureRecord("tenure:t1", "person:x", "pos:college", "2024-01-01"),
      tenureRecord("tenure:t2", "person:y", "pos:college", "2024-01-01"),
    ],
    "meta.json": { snapshotId: "2026-09-18" },
  });

  const result = await deriveChanges({ dataDir });
  const vacancies = result.changes.filter((c) => c.kind === "vacancy");
  assert.equal(vacancies.length, 1);
  assert.equal(vacancies[0].date, "2026-09-18");
  assert.equal(vacancies[0].position, "pos:college");
  assert.equal(vacancies[0].organization, "org:o");
  assert.equal(vacancies[0].source.source, "src:p");
  assert.match(vacancies[0].summary, /één onvervulde zetel/);
});

test("a position with no tenure at all is not called vacant", async () => {
  const { dataDir } = await setup();
  await writeDataset(dataDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [positionRecord("pos:untouched", "Onbezet", "org:o", { seatsCount: 2 })],
    "people.json": basePeople(),
    "tenures.json": [],
    "meta.json": { snapshotId: "2026-09-18" },
  });

  const result = await deriveChanges({ dataDir });
  assert.equal(result.changes.filter((c) => c.kind === "vacancy").length, 0);
  assert.deepEqual(result.changes, []);
});

test("an unsourced tenure is dropped and counted", async () => {
  const { dataDir } = await setup();
  await writeDataset(dataDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [positionRecord("pos:p", "Minister", "org:o")],
    "people.json": basePeople(),
    "tenures.json": [tenureRecord("tenure:t1", "person:x", "pos:p", "2026-03-01", null, { source: undefined })],
    "meta.json": { snapshotId: "2026-09-18" },
  });

  const result = await deriveChanges({ dataDir });
  assert.equal(result.changes.length, 0);
  assert.equal(result.skipped.unsourced, 1);
});

test("an empty dataset derives no changes and does not throw", async () => {
  const { dataDir, outPath } = await setup();
  await writeDataset(dataDir, { "meta.json": { snapshotId: "2026-09-18" } });

  const result = await deriveChanges({ dataDir });
  assert.deepEqual(result.changes, []);
  await writeChanges({ dataDir, outPath });
  assert.deepEqual(await readJson(outPath), []);
});

test("the same dataset derives byte-identical output twice", async () => {
  const { dataDir, outPath } = await setup();
  await writeDataset(dataDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [positionRecord("pos:p", "Minister", "org:o")],
    "people.json": basePeople(),
    "tenures.json": [
      tenureRecord("tenure:t1", "person:x", "pos:p", "2026-03-01"),
      tenureRecord("tenure:t2", "person:y", "pos:p", "2026-01-01", "2026-02-01"),
      tenureRecord("tenure:t3", "person:x", "pos:p", "2020-01-01"),
    ],
    "meta.json": { snapshotId: "2026-09-18" },
  });

  await writeChanges({ dataDir, outPath });
  const first = await readFile(outPath, "utf8");
  await writeChanges({ dataDir, outPath });
  const second = await readFile(outPath, "utf8");
  assert.equal(first, second);
});

test("every derived change carries a stable id and a source reference", async () => {
  const { dataDir } = await setup();
  await writeDataset(dataDir, {
    "organizations.json": [orgRecord("org:o", "Org")],
    "positions.json": [positionRecord("pos:p", "Minister", "org:o", { seatsCount: 1 })],
    "people.json": basePeople(),
    "tenures.json": [tenureRecord("tenure:t1", "person:x", "pos:p", "2026-03-01")],
    "meta.json": { snapshotId: "2026-09-18" },
  });

  const result = await deriveChanges({ dataDir });
  for (const change of result.changes) {
    assert.match(change.id, /^change:[a-z0-9][a-z0-9-]*$/);
    assert.match(change.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(change.source && change.source.source.startsWith("src:"));
    assert.ok(change.summary.length > 0);
  }
});
