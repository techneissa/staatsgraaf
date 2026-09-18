#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const END_REASON_TEXT = {
  aftreden: "afgetreden",
  ontslag: "ontslagen",
  "einde-termijn": "einde termijn",
  overlijden: "overleden",
  reorganisatie: "reorganisatie",
};

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

function asChange({ date, kind, position, organization, out, in: incoming, summary, source }) {
  const change = { date, kind, summary, source };
  if (position) change.position = position;
  if (organization) change.organization = organization;
  if (out) change.out = out;
  if (incoming) change.in = incoming;
  return change;
}

export async function deriveChanges({ dataDir, snapshotDate, now = new Date() }) {
  const [organizationsArr, positionsArr, peopleArr, tenuresArr] = await Promise.all([
    readArray(dataDir, "organizations.json"),
    readArray(dataDir, "positions.json"),
    readArray(dataDir, "people.json"),
    readArray(dataDir, "tenures.json"),
  ]);

  const organizations = indexById(organizationsArr);
  const positions = indexById(positionsArr);
  const people = indexById(peopleArr);
  const tenures = indexById(tenuresArr);

  const date = snapshotDate ?? (await readSnapshotId(dataDir, now.toISOString().slice(0, 10)));
  const idFor = makeIdFactory();
  const changes = [];
  const skipped = { unsourced: 0, unresolved: 0 };

  const resolvePosition = (tenure) => positions.get(tenure.position) ?? null;
  const titleOf = (position, fallback) => position?.title ?? fallback ?? "onbekende functie";
  const orgNameOf = (position) =>
    position ? organizations.get(position.organization)?.name ?? position.organization : null;

  for (const tenure of tenuresArr) {
    if (typeof tenure.start !== "string") continue;
    const position = resolvePosition(tenure);
    if (!position) {
      skipped.unresolved += 1;
      continue;
    }
    const source = pickSource(tenure);
    if (!source) {
      skipped.unsourced += 1;
      continue;
    }
    const title = titleOf(position, tenure.position);
    const predecessor =
      tenure.predecessor && tenures.has(tenure.predecessor) ? tenures.get(tenure.predecessor) : null;
    const out = predecessor
      ? { tenure: predecessor.id, person: predecessor.person, label: tenureLabel(people, title, predecessor) }
      : { tenure: null, person: null, label: "Geen voorganger bekend" };
    const incoming = { tenure: tenure.id, person: tenure.person, label: tenureLabel(people, title, tenure) };
    changes.push(
      asChange({
        date: tenure.start,
        kind: "appointment",
        position: position.id,
        organization: position.organization,
        out,
        in: incoming,
        summary: tenure.acting
          ? `Waarnemend benoemd: ${labelOf(people, tenure.person)} als ${title}.`
          : `Benoeming: ${labelOf(people, tenure.person)} wordt ${title}.`,
        source,
      }),
    );
  }

  for (const tenure of tenuresArr) {
    if (typeof tenure.end !== "string") continue;
    const position = resolvePosition(tenure);
    if (!position) {
      skipped.unresolved += 1;
      continue;
    }
    const source = pickSource(tenure);
    if (!source) {
      skipped.unsourced += 1;
      continue;
    }
    const title = titleOf(position, tenure.position);
    let successor = tenure.successor && tenures.has(tenure.successor) ? tenures.get(tenure.successor) : null;
    if (!successor) successor = tenuresArr.find((candidate) => candidate.predecessor === tenure.id) ?? null;
    const incoming = successor
      ? { tenure: successor.id, person: successor.person, label: tenureLabel(people, title, successor) }
      : { tenure: null, person: null, label: "Geen opvolger bekend" };
    const reason = END_REASON_TEXT[tenure.endReason] ?? tenure.endReason;
    changes.push(
      asChange({
        date: tenure.end,
        kind: "departure",
        position: position.id,
        organization: position.organization,
        out: { tenure: tenure.id, person: tenure.person, label: tenureLabel(people, title, tenure) },
        in: incoming,
        summary: reason
          ? `${labelOf(people, tenure.person)} vertrekt als ${title} (${reason}).`
          : `${labelOf(people, tenure.person)} vertrekt als ${title}.`,
        source,
      }),
    );
  }

  const openCount = new Map();
  const tenureCount = new Map();
  for (const tenure of tenuresArr) {
    tenureCount.set(tenure.position, (tenureCount.get(tenure.position) ?? 0) + 1);
    if ((tenure.end ?? null) === null) openCount.set(tenure.position, (openCount.get(tenure.position) ?? 0) + 1);
  }

  for (const position of positionsArr) {
    const tracked = tenureCount.get(position.id) ?? 0;
    if (tracked === 0) continue;
    const open = openCount.get(position.id) ?? 0;
    const seats = typeof position.seatsCount === "number" ? position.seatsCount : open > 0 ? open : 1;
    const vacant = Math.max(0, seats - open);
    if (vacant === 0) continue;
    const source = pickSource(position);
    if (!source) {
      skipped.unsourced += 1;
      continue;
    }
    const name = orgNameOf(position);
    changes.push(
      asChange({
        date,
        kind: "vacancy",
        position: position.id,
        organization: position.organization,
        out: { tenure: null, person: null, label: `${open} van ${seats} zetels vervuld` },
        in: { tenure: null, person: null, label: vacant === 1 ? "1 vacante zetel" : `${vacant} vacante zetels` },
        summary:
          vacant === 1
            ? `Vacature: ${position.title}${name ? ` bij ${name}` : ""} heeft één onvervulde zetel.`
            : `Vacature: ${position.title}${name ? ` bij ${name}` : ""} heeft ${vacant} onvervulde zetels.`,
        source,
      }),
    );
  }

  for (const change of changes) change.id = idFor(change.date, change.kind, change.position ?? change.organization);
  changes.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  return { changes, snapshotDate: date, skipped };
}

function parseArgs(argv) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const options = { dataDir: join(root, "data"), outPath: null };
  const positional = argv.filter((arg) => !arg.startsWith("--"));
  if (positional.length >= 1) options.dataDir = positional[0];
  const outIndex = argv.indexOf("--out");
  options.outPath = outIndex >= 0 ? argv[outIndex + 1] : join(options.dataDir, "changes.json");
  return options;
}

export async function writeChanges({ dataDir, outPath, snapshotDate } = {}) {
  const target = dataDir ?? join(dirname(fileURLToPath(import.meta.url)), "..", "data");
  const result = await deriveChanges({ dataDir: target, snapshotDate });
  await writeJson(outPath ?? join(target, "changes.json"), result.changes);
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await writeChanges(options);
  const byKind = {};
  for (const change of result.changes) byKind[change.kind] = (byKind[change.kind] ?? 0) + 1;
  console.log(`Derived ${result.changes.length} change(s) at snapshot ${result.snapshotDate} from ${options.dataDir}`);
  for (const [kind, count] of Object.entries(byKind).sort()) console.log(`  ${kind.padEnd(12)} ${count}`);
  if (result.skipped.unsourced > 0 || result.skipped.unresolved > 0) {
    console.log(`Skipped: ${result.skipped.unsourced} without source, ${result.skipped.unresolved} with unresolved references.`);
  }
  console.log(`Wrote ${options.outPath}`);
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`changes failed: ${error.message}`);
    process.exitCode = 1;
  });
}
