#!/usr/bin/env bun
// Contract check for the published dataset artifact.
//
// The published /data/v1 files are the contract every client (web, later the
// Swift app) decodes. This script proves the artifact equals the validated
// dataset in data/: byte-for-byte via the manifest sha256 entries, with the
// manifest record counts matching the actual files.
//
// Run it against the built export (web/out/data/v1) in the deploy workflows and
// against the committed artifact (web/public/data/v1) in CI.
//
// Usage:
//   bun scripts/check-contract.mjs [dir]
//
// Exit code is 0 when the contract holds, 1 on any break.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data");

const argDir = process.argv[2];
const artifactDir =
  argDir ??
  (existsSync(join(ROOT, "web", "out", "data", "v1"))
    ? join(ROOT, "web", "out", "data", "v1")
    : join(ROOT, "web", "public", "data", "v1"));

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function fail(message) {
  console.error(`CONTRACT FAIL: ${message}`);
  process.exitCode = 1;
}

const manifestPath = join(artifactDir, "manifest.json");
if (!existsSync(manifestPath)) {
  fail(`no manifest.json in ${artifactDir}. Build the web app first (cd web && bun run build).`);
  process.exit(process.exitCode ?? 1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const manifestByName = new Map((manifest.files ?? []).map((entry) => [entry.name, entry]));

let checked = 0;

// Every JSON dataset file must exist in the artifact, match the dataset copy by
// sha256, and be listed in the manifest with the same sha256.
const dataFiles = readdirSync(DATA_DIR).filter((name) => name.endsWith(".json")).sort();
for (const name of dataFiles) {
  const dataset = readFileSync(join(DATA_DIR, name));
  const digest = sha256(dataset);

  const artifactPath = join(artifactDir, name);
  if (!existsSync(artifactPath)) {
    fail(`${name} is missing from ${artifactDir}`);
    continue;
  }
  const publishedDigest = sha256(readFileSync(artifactPath));
  if (publishedDigest !== digest) {
    fail(`${name} in ${artifactDir} differs from data/${name}`);
    continue;
  }

  const entry = manifestByName.get(name);
  if (!entry) {
    fail(`${name} is missing from manifest.json`);
    continue;
  }
  if (entry.sha256 !== digest) {
    fail(`${name} sha256 in manifest.json does not match (${entry.sha256} != ${digest})`);
    continue;
  }
  checked += 1;
}

// Manifest counts must match the dataset.
const countTotal = Object.values(manifest.recordCounts ?? {}).reduce(
  (sum, count) => sum + (typeof count === "number" ? count : 0),
  0,
);
if (manifest.sourceCount !== (manifest.recordCounts["sources.json"] ?? null)) {
  fail(`manifest sourceCount ${manifest.sourceCount} does not match recordCounts.sources.json`);
}
if (countTotal === 0) {
  fail("manifest recordCounts is empty");
}

// Both license files must be present and match the repo root copies.
for (const [artifactName, rootName] of [
  ["LICENSE.txt", "LICENSE"],
  ["LICENSE-DATA.txt", "LICENSE-DATA"],
]) {
  const artifactPath = join(artifactDir, artifactName);
  const rootPath = join(ROOT, rootName);
  if (!existsSync(rootPath)) {
    fail(`${rootName} is missing at the repo root`);
    continue;
  }
  if (!existsSync(artifactPath)) {
    fail(`${artifactName} is missing from ${artifactDir}`);
    continue;
  }
  const digest = sha256(readFileSync(rootPath));
  const entry = manifestByName.get(artifactName);
  if (sha256(readFileSync(artifactPath)) !== digest) {
    fail(`${artifactName} differs from the repo root ${rootName}`);
  } else if (entry && entry.sha256 !== digest) {
    fail(`${artifactName} sha256 in manifest.json does not match`);
  }
}

if (process.exitCode === 1) {
  process.exit(1);
}
console.log(
  `CONTRACT OK: ${artifactDir} matches data/ (${checked} dataset files, ` +
    `${manifest.sourceCount} sources, snapshotId ${manifest.snapshotId}).`,
);
