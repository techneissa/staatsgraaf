#!/usr/bin/env bun
// Did a refresh change anything that matters? The scheduled workflow commits and
// deploys only when this says yes (.github/workflows/news.yml).
//
//   bun scripts/data-changed.mjs <path>...      paths are files or directories
//
// Compares the working tree with HEAD. A JSON file counts as changed when it
// differs once the volatile `generatedAt` timestamp keys are dropped, because
// data/meta.json and research/P-live-ambtsdragers.json are rewritten with a new
// timestamp on every run even when no fact moved. Any other file counts as
// changed on any byte difference, and a new or deleted file always counts.
// Prints the changed paths, and writes `changed=true|false` to $GITHUB_OUTPUT
// when that variable is set. Exit code 0 either way; it fails only on a git error.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const VOLATILE_KEYS = new Set(["generatedAt"]);

function git(args, quiet = false) {
  return execFileSync("git", args, { encoding: "buffer", maxBuffer: 1 << 30, stdio: ["ignore", "pipe", quiet ? "ignore" : "inherit"] });
}

function strip(value) {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, v] of Object.entries(value)) if (!VOLATILE_KEYS.has(key)) out[key] = strip(v);
    return out;
  }
  return value;
}

export function sameContent(path, a, b) {
  if (a === null || b === null) return a === b;
  if (a.equals(b)) return true;
  if (!path.endsWith(".json")) return false;
  try {
    return JSON.stringify(strip(JSON.parse(a.toString("utf8")))) === JSON.stringify(strip(JSON.parse(b.toString("utf8"))));
  } catch {
    return false;
  }
}

function headBlob(path) {
  try {
    return git(["show", `HEAD:${path}`], true); // a path that is new has no blob in HEAD
  } catch {
    return null;
  }
}

function listFiles(pathspecs) {
  const tracked = git(["ls-files", "-z", "--", ...pathspecs]).toString("utf8").split("\0");
  const untracked = git(["ls-files", "-z", "--others", "--exclude-standard", "--", ...pathspecs]).toString("utf8").split("\0");
  return [...new Set([...tracked, ...untracked].filter(Boolean))].sort();
}

export function changedPaths(pathspecs) {
  const changed = [];
  for (const path of listFiles(pathspecs)) {
    const before = headBlob(path);
    const after = existsSync(path) ? readFileSync(path) : null;
    if (!sameContent(path, before, after)) changed.push(path);
  }
  return changed;
}

if (import.meta.main) {
  const specs = process.argv.slice(2);
  if (specs.length === 0) {
    console.error("usage: bun scripts/data-changed.mjs <path>...");
    process.exit(2);
  }
  const changed = changedPaths(specs);
  for (const path of changed) console.log(path);
  console.log(changed.length ? `changed: ${changed.length} file(s)` : "unchanged: only volatile timestamps differ, or nothing differs");
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed.length > 0}\n`);
}
