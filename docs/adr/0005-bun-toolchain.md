# ADR 0005: Bun as the package manager, script runner, and pipeline runtime

- Date: 18-09-2026
- Status: accepted
- Supersedes: the npm and Node.js tooling choices implied in `docs/06-build-plan.md` section 3 and `docs/11-delivery-and-collaboration.md` section 3

## Context

Until this decision the repo used npm as the package manager and Node.js as the runtime for everything: the pipelines, the validator, the tests, the web build scripts, and the Next.js build. Two `package-lock.json` files were committed, one at the root and one in `web/`, and both GitHub Actions workflows ran `npm ci`.

The owner asked on 18-09-2026 to move the toolchain to Bun before the next build phases start, so that later work runs on one tool from the start rather than migrating mid-phase.

The measurable facts at decision time:

- The root package has no dependencies. Its scripts only start plain JavaScript modules.
- All 110 tests import from `node:test` and `node:assert/strict`. Bun 1.4.2 runs them unchanged: 110 pass, 0 fail.
- The validator, both research checks, and the four web prebuild scripts produce byte-identical output under Bun and under Node.
- Next.js 16 builds with Turbopack, which runs on Node. Running the Next.js build itself on the Bun runtime is not a supported configuration we have verified, and the build is not the slow part of the nightly refresh.

## Decision

1. **Bun is the package manager.** `bun install` in `web/` writes and reads `web/bun.lock`, which is committed. The root has no dependencies, so it has no lockfile and no install step. The `package-lock.json` files are removed.
2. **Bun is the script runner and the runtime for our own code.** Every `package.json` script that starts one of our `.mjs` files does so with `bun <file>`. The pipelines, the validator, the link checker, and the web prebuild scripts run on Bun. Shebang lines read `#!/usr/bin/env bun`.
3. **Bun is the test runner.** `bun test pipelines web/lib` runs the suites. Test files keep their `node:test` imports; no test was rewritten for the switch.
4. **Next.js, tsc, and Wrangler keep running on Node.** `bun run build`, `bun run dev`, `bun run typecheck`, and the deploy step start those binaries through Bun's script runner, which honours their node shebang. Node 20.9 or newer stays a requirement for the web build and the deploy, and for nothing else.
5. **The Bun version is pinned in `.bun-version`** (1.4.2 at the time of writing). Both workflows install that version with `oven-sh/setup-bun@v2` and use `bun install --frozen-lockfile`, so CI fails if the lockfile and the manifest disagree instead of silently resolving new versions.
6. **The engines fields state both requirements.** The root manifest requires Bun 1.2 or newer. The web manifest requires Bun 1.2 or newer and Node 20.9 or newer.

## Consequences

- One command prefix everywhere: `bun run <task>` at the root and in `web/`, `bun test` for the tests, `bunx` for one-off binaries such as `wrangler` and `serve`.
- Contributors need Bun installed, and Node as well if they build or run the web app. The README, `CONTRIBUTING.md`, `web/README.md`, and `.github/workflows/README.md` state this.
- Test files stay portable. Because they import from `node:test`, they would still run under `node --test` if the decision were ever reversed.
- The nightly refresh keeps its step order from ADR 0004: merge, news, changes, validate, test, build, deploy. Only the tool that starts each step changed.
- A future step that moves the Next.js build onto the Bun runtime is a separate decision. It needs its own verification of the static export, the `_headers` file, and the page count before it ships.

## Verification recorded at decision time

- `bun test pipelines web/lib`: 110 pass, 0 fail.
- `bun run validate` and `bun run research:check`: schema and referential integrity pass, 12,743 records.
- `bun run prepare-data` in `web/`: same graph, search index, and dataset output as under Node, no working tree changes.
- `bun run typecheck` in `web/`: clean.
- The static export of `bun run build` could not be re-run in the session that made this decision because that environment blocks the Turbopack worker from opening a local port. The first green `ci` and `refresh` runs on GitHub Actions are the confirmation, and they remain a named gap in `.github/workflows/README.md` until they happen.
