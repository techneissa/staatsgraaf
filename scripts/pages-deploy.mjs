#!/usr/bin/env bun
/**
 * Deploy web/out with Wrangler, one upload stream at a time.
 *
 * Wrangler hardcodes 3 bulk upload streams and up to 50 for Edge KV. This
 * Mac is the Actions runner, so that fills the home uplink. There is no
 * flag. Patch the cached CLI for this process, run the same
 * `bunx wrangler pages deploy` as before, then put the file back.
 *
 * Override with WRANGLER_UPLOAD_CONCURRENCY (default 1).
 */
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const cap = Math.max(1, Number.parseInt(process.env.WRANGLER_UPLOAD_CONCURRENCY || "1", 10) || 1);
const extra = process.argv.slice(2);

const version = spawnSync("bunx", ["wrangler", "--version"], { encoding: "utf8" });
if (version.status !== 0) {
  process.stderr.write(version.stderr || "bunx wrangler --version failed\n");
  process.exit(version.status || 1);
}

const cache = join(process.env.HOME || "", ".bun/install/cache");
const dirs = readdirSync(cache)
  .filter((name) => name.startsWith("wrangler@"))
  .map((name) => join(cache, name))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
if (dirs.length === 0) {
  process.stderr.write("wrangler is not in the bun cache\n");
  process.exit(1);
}

const cli = join(dirs[0], "wrangler-dist/cli.js");
const orig = readFileSync(cli, "utf8");
let src = orig;
src = src.replaceAll("BULK_UPLOAD_CONCURRENCY = 3", `BULK_UPLOAD_CONCURRENCY = ${cap}`);
src = src.replaceAll("BULK_UPLOAD_CONCURRENCY2 = 3", `BULK_UPLOAD_CONCURRENCY2 = ${cap}`);
src = src.replaceAll("EDGE_KV_UPLOAD_CONCURRENCY = 50", `EDGE_KV_UPLOAD_CONCURRENCY = ${cap}`);
src = src.replace(
  "return value > 0 ? Math.floor(value) : EDGE_KV_UPLOAD_CONCURRENCY;",
  `return ${cap};`,
);
if (src === orig) {
  process.stderr.write(`could not patch wrangler upload concurrency in ${cli}\n`);
  process.exit(1);
}

writeFileSync(cli, src);
process.stderr.write(`wrangler upload concurrency ${cap}\n`);
let status = 1;
try {
  const result = spawnSync(
    "bunx",
    ["wrangler", "pages", "deploy", "web/out", "--project-name=staatsgraaf", "--branch=main", ...extra],
    { stdio: "inherit", env: process.env },
  );
  status = result.status ?? 1;
} finally {
  writeFileSync(cli, orig);
}
process.exit(status);
