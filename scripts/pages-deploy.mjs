#!/usr/bin/env bun
/**
 * Deploy web/out to Cloudflare Pages with Wrangler.
 *
 * On a GitHub-hosted runner this is a plain `bunx wrangler pages deploy`. The
 * upload throttle below exists only for a deploy from a home connection
 * (`WRANGLER_UPLOAD_CONCURRENCY=1 bun scripts/pages-deploy.mjs`): Wrangler
 * hardcodes 3 bulk upload streams and up to 50 for Edge KV, with no flag, so
 * with the variable set this patches the cached CLI for this process and puts
 * the file back afterwards. The workflows do not set it.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Pinned, so a deploy never runs a Wrangler release nobody has looked at.
const WRANGLER = "wrangler@4.154.0";

const extra = process.argv.slice(2);
const deploy = () =>
  spawnSync("bunx", [WRANGLER, "pages", "deploy", "web/out", "--project-name=staatsgraaf", "--branch=main", ...extra], {
    stdio: "inherit",
    env: process.env,
  });

if (!process.env.WRANGLER_UPLOAD_CONCURRENCY) process.exit(deploy().status ?? 1);

const cap = Math.max(1, Number.parseInt(process.env.WRANGLER_UPLOAD_CONCURRENCY, 10) || 1);

const version = spawnSync("bunx", [WRANGLER, "--version"], { encoding: "utf8" });
if (version.status !== 0) {
  process.stderr.write(version.stderr || `bunx ${WRANGLER} --version failed\n`);
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
  status = deploy().status ?? 1;
} finally {
  writeFileSync(cli, orig);
}
process.exit(status);
