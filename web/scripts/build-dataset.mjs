#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = fileURLToPath(new URL("../../data/", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT_DIR = fileURLToPath(new URL("../public/data/v1/", import.meta.url));
const MANIFEST_NAME = "manifest.json";

const LICENSE_FILES = [
  { from: join(REPO_ROOT, "LICENSE-DATA"), to: "LICENSE-DATA.txt" },
  { from: join(REPO_ROOT, "LICENSE"), to: "LICENSE.txt" },
];

function compareCodeUnit(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

// The repository is public: pipelines, raw sources, and the merge log live in
// the open, so every published fact can be re-derived.
const SOURCE_REPOSITORY_URL = "https://github.com/techneissa/staatsgraaf";
const SOURCE_REPOSITORY_NOTE =
  "De repository met de pipelines en de ruwe bronbestanden is openbaar. Elke bron " +
  "met URL en ophaaldatum staat in sources.json; de licentie per bron staat erbij en ATTRIBUTION.md groepeert de bronnen per uitgever en licentie.";

mkdirSync(OUT_DIR, { recursive: true });

const meta = JSON.parse(readFileSync(join(DATA_DIR, "meta.json"), "utf8"));

const dataFiles = readdirSync(DATA_DIR)
  .filter((name) => name.endsWith(".json"))
  .sort(compareCodeUnit);

const recordCounts = {};
const files = [];

for (const name of dataFiles) {
  const source = join(DATA_DIR, name);
  const buffer = readFileSync(source);
  copyFileSync(source, join(OUT_DIR, name));
  files.push({ name, bytes: buffer.length, sha256: sha256(buffer) });
  const value = JSON.parse(buffer.toString("utf8"));
  if (Array.isArray(value)) recordCounts[name] = value.length;
}

for (const license of LICENSE_FILES) {
  const buffer = readFileSync(license.from);
  copyFileSync(license.from, join(OUT_DIR, license.to));
  files.push({ name: license.to, bytes: buffer.length, sha256: sha256(buffer) });
}

files.sort((a, b) => compareCodeUnit(a.name, b.name));

const manifest = {
  datasetVersion: typeof meta.datasetVersion === "string" ? meta.datasetVersion : null,
  snapshotId: typeof meta.snapshotId === "string" ? meta.snapshotId : null,
  generatedAt: typeof meta.generatedAt === "string" ? meta.generatedAt : null,
  licenses: {
    code: typeof meta.licenses?.code === "string" ? meta.licenses.code : "MIT",
    data: typeof meta.licenses?.data === "string" ? meta.licenses.data : "CC-BY-4.0",
  },
  licenseUrl:
    typeof meta.datasetLicenseUrl === "string" ? meta.datasetLicenseUrl : null,
  sourceCount: recordCounts["sources.json"] ?? 0,
  recordCounts,
  sourceRepository: {
    url: SOURCE_REPOSITORY_URL,
    note: SOURCE_REPOSITORY_NOTE,
  },
  files,
};

const json = `${JSON.stringify(manifest, null, 2)}\n`;
writeFileSync(join(OUT_DIR, MANIFEST_NAME), json);

const bytes = Buffer.byteLength(json, "utf8");
console.log(
  `dataset ${manifest.datasetVersion}: ${files.length} files, ` +
    `${manifest.sourceCount} sources, manifest ${bytes} bytes, ` +
    `${manifest.recordCounts["organizations.json"] ?? 0} organizations, ` +
    `${manifest.recordCounts["people.json"] ?? 0} people, ` +
    `${manifest.recordCounts["positions.json"] ?? 0} positions`,
);
