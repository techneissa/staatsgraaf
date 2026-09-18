#!/usr/bin/env bun
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function readArray(dir, file) {
  const full = join(dir, file);
  if (!existsSync(full)) return [];
  const parsed = JSON.parse(await readFile(full, "utf8"));
  return Array.isArray(parsed) ? parsed : [];
}

async function readSnapshotId(dir, fallback) {
  const full = join(dir, "meta.json");
  if (!existsSync(full)) return fallback;
  try {
    const meta = JSON.parse(await readFile(full, "utf8"));
    return typeof meta.snapshotId === "string" ? meta.snapshotId : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  const dir = dirname(file);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function indexById(records) {
  return new Map(records.map((record) => [record.id, record]));
}

function pickSource(record) {
  const candidate = record.source && typeof record.source.source === "string" ? record.source : null;
  if (candidate) return structuredClone(candidate);
  if (Array.isArray(record.sources)) {
    const first = record.sources.find((ref) => ref && typeof ref.source === "string");
    if (first) return structuredClone(first);
  }
  return null;
}

function slugOf(key) {
  const stripped = String(key).replace(/^[a-z]+:/, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return stripped || "unknown";
}

function makeIdFactory() {
  const used = new Set();
  return (date, kind, key) => {
    const base = `change:${date}-${kind}-${slugOf(key)}`;
    let id = base;
    let counter = 2;
    while (used.has(id)) {
      id = `${base}-${counter}`;
      counter += 1;
    }
    used.add(id);
    return id;
  };
}

function labelOf(people, personId) {
  return people.get(personId)?.name ?? personId;
}

function tenureLabel(people, title, tenure) {
  return `${labelOf(people, tenure.person)} - ${title}`;
}

function tenureRef(tenure, people, title) {
  if (!tenure) return { tenure: null, person: null, label: "Geen voorganger bekend" };
  return { tenure: tenure.id, person: tenure.person, label: tenureLabel(people, title, tenure) };
}

function asChange({ date, kind, position, organization, out, in: incoming, summary, source }) {
  const change = { date, kind, summary, source };
  if (position) change.position = position;
  if (organization) change.organization = organization;
  if (out) change.out = out;
  if (incoming) change.in = incoming;
  return change;
}

function openCounts(tenures) {
  const counts = new Map();
  for (const tenure of tenures.values()) {
    if ((tenure.end ?? null) !== null) continue;
    counts.set(tenure.position, (counts.get(tenure.position) ?? 0) + 1);
  }
  return counts;
}

function tenureCounts(tenures) {
  const counts = new Map();
  for (const tenure of tenures.values()) {
    counts.set(tenure.position, (counts.get(tenure.position) ?? 0) + 1);
  }
  return counts;
}

function seatCapacity(position, open) {
  return typeof position.seatsCount === "number" ? position.seatsCount : open > 0 ? open : 1;
}

function seatDeficit(position, open) {
  return Math.max(0, seatCapacity(position, open) - open);
}

export async function diffDatasets({ previousDir, currentDir, outPath, snapshotDate, now = new Date() }) {
  const today = now.toISOString().slice(0, 10);
  if (!previousDir) {
    await writeJson(outPath, []);
    return { changes: [], noPrevious: true, reason: "no previous snapshot supplied; wrote [] rather than fabricate history" };
  }
  if (!existsSync(previousDir)) throw new Error(`previous snapshot directory not found: ${previousDir}`);

  const [prevOrgs, currOrgs, prevPositions, currPositions, peopleArr, prevTenuresArr, currTenuresArr] = await Promise.all([
    readArray(previousDir, "organizations.json"),
    readArray(currentDir, "organizations.json"),
    readArray(previousDir, "positions.json"),
    readArray(currentDir, "positions.json"),
    readArray(currentDir, "people.json"),
    readArray(previousDir, "tenures.json"),
    readArray(currentDir, "tenures.json"),
  ]);

  const prevOrgsById = indexById(prevOrgs);
  const currOrgsById = indexById(currOrgs);
  const prevPositionsById = indexById(prevPositions);
  const currPositionsById = indexById(currPositions);
  const people = indexById(peopleArr);
  const prevTenures = indexById(prevTenuresArr);
  const currTenures = indexById(currTenuresArr);

  const date = snapshotDate ?? (await readSnapshotId(currentDir, today));
  const idFor = makeIdFactory();
  const changes = [];

  for (const tenure of currTenures.values()) {
    if (prevTenures.has(tenure.id)) continue;
    const source = pickSource(tenure);
    if (!source) continue;
    const position = currPositionsById.get(tenure.position) ?? prevPositionsById.get(tenure.position);
    const title = position?.title ?? tenure.position;
    const predecessor = tenure.predecessor ? currTenures.get(tenure.predecessor) ?? prevTenures.get(tenure.predecessor) : null;
    const out = tenureRef(predecessor, people, title);
    if (!predecessor) out.label = "Geen voorganger bekend";
    const incoming = { tenure: tenure.id, person: tenure.person, label: tenureLabel(people, title, tenure) };
    const summary = tenure.acting ? `Waarnemend benoemd: ${labelOf(people, tenure.person)} als ${title}.` : `Benoeming: ${labelOf(people, tenure.person)} wordt ${title}.`;
    changes.push(
      asChange({
        date: tenure.start,
        kind: "appointment",
        position: tenure.position,
        organization: position?.organization ?? null,
        out,
        in: incoming,
        summary,
        source,
      }),
    );
  }

  for (const tenure of currTenures.values()) {
    const before = prevTenures.get(tenure.id);
    if (!before) continue;
    if ((before.end ?? null) !== null || (tenure.end ?? null) === null) continue;
    const source = pickSource(tenure);
    if (!source) continue;
    const position = currPositionsById.get(tenure.position) ?? prevPositionsById.get(tenure.position);
    const title = position?.title ?? tenure.position;
    const successorId = tenure.successor ?? [...currTenures.values()].find((t) => t.predecessor === tenure.id)?.id ?? null;
    const successor = successorId ? currTenures.get(successorId) ?? prevTenures.get(successorId) : null;
    const summary = tenure.endReason
      ? `${labelOf(people, tenure.person)} vertrekt als ${title} (${tenure.endReason}).`
      : `${labelOf(people, tenure.person)} vertrekt als ${title}.`;
    changes.push(
      asChange({
        date: tenure.end,
        kind: "departure",
        position: tenure.position,
        organization: position?.organization ?? null,
        out: { tenure: tenure.id, person: tenure.person, label: tenureLabel(people, title, tenure) },
        in: successor
          ? { tenure: successor.id, person: successor.person, label: tenureLabel(people, title, successor) }
          : { tenure: null, person: null, label: "Geen opvolger bekend" },
        summary,
        source,
      }),
    );
  }

  const prevOpen = openCounts(prevTenures);
  const currOpen = openCounts(currTenures);
  const prevTenureCount = tenureCounts(prevTenures);
  const currTenureCount = tenureCounts(currTenures);
  for (const position of currPositionsById.values()) {
    const tracked = (prevTenureCount.get(position.id) ?? 0) + (currTenureCount.get(position.id) ?? 0);
    if (tracked === 0) continue;
    const before = seatDeficit(position, prevOpen.get(position.id) ?? 0);
    const after = seatDeficit(position, currOpen.get(position.id) ?? 0);
    if (after <= before) continue;
    const source = pickSource(position);
    if (!source) continue;
    const organization = currOrgsById.get(position.organization);
    const open = currOpen.get(position.id) ?? 0;
    const seats = seatCapacity(position, open);
    const name = organization?.name ?? position.organization;
    changes.push(
      asChange({
        date,
        kind: "vacancy",
        position: position.id,
        organization: position.organization,
        out: { tenure: null, person: null, label: `${open} van ${seats} zetels vervuld` },
        in: { tenure: null, person: null, label: after === 1 ? "1 vacante zetel" : `${after} vacante zetels` },
        summary:
          after === 1
            ? `Vacature: ${position.title} bij ${name} heeft één onvervulde zetel.`
            : `Vacature: ${position.title} bij ${name} heeft ${after} onvervulde zetels.`,
        source,
      }),
    );
  }

  for (const organization of currOrgsById.values()) {
    if (prevOrgsById.has(organization.id)) continue;
    const source = pickSource(organization);
    if (!source) continue;
    changes.push(
      asChange({
        date,
        kind: "structural",
        organization: organization.id,
        summary: `Nieuwe organisatie: ${organization.name}.`,
        source,
      }),
    );
  }

  for (const organization of currOrgsById.values()) {
    const before = prevOrgsById.get(organization.id);
    if (!before || before.name === organization.name) continue;
    const source = pickSource(organization);
    if (!source) continue;
    changes.push(
      asChange({
        date,
        kind: "rename",
        organization: organization.id,
        out: { tenure: null, person: null, label: before.name },
        in: { tenure: null, person: null, label: organization.name },
        summary: `Naamswijziging: ${before.name} heet nu ${organization.name}.`,
        source,
      }),
    );
  }

  for (const position of currPositionsById.values()) {
    const before = prevPositionsById.get(position.id);
    if (!before || before.title === position.title) continue;
    const source = pickSource(position);
    if (!source) continue;
    changes.push(
      asChange({
        date,
        kind: "rename",
        position: position.id,
        organization: position.organization,
        out: { tenure: null, person: null, label: before.title },
        in: { tenure: null, person: null, label: position.title },
        summary: `Naamswijziging: ${before.title} heet nu ${position.title}.`,
        source,
      }),
    );
  }

  const samePartOf = (a, b) => JSON.stringify((a ?? []).slice().sort()) === JSON.stringify((b ?? []).slice().sort());
  for (const organization of currOrgsById.values()) {
    const before = prevOrgsById.get(organization.id);
    if (!before) continue;
    if ((before.parent ?? null) === (organization.parent ?? null) && samePartOf(before.partOf, organization.partOf)) continue;
    const source = pickSource(organization);
    if (!source) continue;
    const parentName = organization.parent ? currOrgsById.get(organization.parent)?.name ?? organization.parent : "geen moederorganisatie";
    const previousName = before.parent ? prevOrgsById.get(before.parent)?.name ?? before.parent : "geen moederorganisatie";
    changes.push(
      asChange({
        date,
        kind: "move",
        organization: organization.id,
        out: { tenure: null, person: null, label: previousName },
        in: { tenure: null, person: null, label: parentName },
        summary: `Herindeling: ${organization.name} valt nu onder ${parentName}.`,
        source,
      }),
    );
  }

  for (const position of currPositionsById.values()) {
    const before = prevPositionsById.get(position.id);
    if (!before || before.organization === position.organization) continue;
    const source = pickSource(position);
    if (!source) continue;
    const currName = currOrgsById.get(position.organization)?.name ?? position.organization;
    const prevName = prevOrgsById.get(before.organization)?.name ?? before.organization;
    changes.push(
      asChange({
        date,
        kind: "move",
        position: position.id,
        organization: position.organization,
        out: { tenure: null, person: null, label: prevName },
        in: { tenure: null, person: null, label: currName },
        summary: `Herindeling: ${position.title} valt nu onder ${currName}.`,
        source,
      }),
    );
  }

  for (const change of changes) change.id = idFor(change.date, change.kind, change.organization ?? change.position);
  changes.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  await writeJson(outPath, changes);
  return { changes, noPrevious: false, snapshotDate: date };
}

function parseArgs(argv) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const options = { previousDir: null, currentDir: join(root, "data"), outPath: null };
  const positional = argv.filter((arg) => !arg.startsWith("--"));
  if (positional.length >= 1) options.previousDir = positional[0];
  if (positional.length >= 2) options.currentDir = positional[1];
  const outIndex = argv.indexOf("--out");
  options.outPath = outIndex >= 0 ? argv[outIndex + 1] : join(options.currentDir, "changes.json");
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await diffDatasets(options);
  if (result.noPrevious) {
    console.log(`No previous snapshot supplied. Wrote [] to ${options.outPath}; history is not fabricated.`);
    return;
  }
  const byKind = {};
  for (const change of result.changes) byKind[change.kind] = (byKind[change.kind] ?? 0) + 1;
  console.log(`Diffed ${options.previousDir} -> ${options.currentDir} at snapshot ${result.snapshotDate}`);
  console.log(`Wrote ${result.changes.length} change(s) to ${options.outPath}:`);
  for (const [kind, count] of Object.entries(byKind).sort()) console.log(`  ${kind.padEnd(12)} ${count}`);
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`diff failed: ${error.message}`);
    process.exitCode = 1;
  });
}
