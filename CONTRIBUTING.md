# Contributing to Staatsgraaf

Staatsgraaf is a public, source-backed graph of the Dutch state. It takes contributions to the dataset, the documentation, the pipelines, and the web app. This document states the conventions a contribution must follow. Read `AGENTS.md` and `docs/11-delivery-and-collaboration.md` first; they are the operating law.

The repository is private today, so there is no public issue tracker or contact address yet. That is a named gap. The rules below apply from the moment the repository opens.

## 1. The source rule

Every non-trivial fact ships with a source, or it does not ship.

- A source is a `src:` record with a URL, a title, a publisher, a type, and a retrieval date. The shape is in `docs/04-data-model.md` section 14 and `schema/v1/source.schema.json`.
- Every fact references its source by id, with a retrieval date and a confidence value. The envelope is enforced by `schema/v1/common.schema.json`.
- Fetch, never recall. Do not write a value from memory, from another site, or from a model.
- When a source cannot be reached or does not state the fact, leave the value out and record a named gap with the endpoint where the fact should be found. An explicit gap passes review. An invented fact fails it.

## 2. Trunk-based flow

- `main` is always deployable. Work on a short-lived branch and merge with a small pull request.
- Keep one concern per pull request. A data change and a UI change ship separately.
- Rebase on `main` before you open the pull request. Do not merge `main` into a feature branch.
- Every pull request states what changed, why, and how it was verified. A data pull request links the sources it used.

## 3. Branch names

| Kind of work | Pattern | Example |
| --- | --- | --- |
| Research workstream | `research/<id>-<topic>` | `research/G-waterschappen` |
| Build area | `build/<area>-<topic>` | `build/O-graph-focus` |
| Data refresh | `data/refresh-<date>` | `data/refresh-2026-10-01` |
| Documentation | `docs/<topic>` | `docs/privacy-acceptance` |

## 4. Commit messages

A commit is a type, a scope, and a short sentence. Types:

`data`, `research`, `schema`, `build`, `docs`, `fix`, `ops`.

Examples: `data: add all 342 gemeenten organisations`, `schema: add ex_officio relation type`, `docs: define privacy acceptance`. Write the sentence in the imperative and in English.

## 5. One writer per file

- Parallel workstreams and build areas own disjoint files. Never edit another owner's file.
- The orchestrator alone edits shared files, including `docs/`, `AGENTS.md`, and `README.md`.
- File ownership is listed in `AGENTS.md` and in `docs/06-build-plan.md` section 5.
- Resolve a conflict in the merge gate and record it, never concurrently.

## 6. Language rule

- Entity names stay in Dutch and unchanged.
- Field names, slugs, ids, and code are English.
- UI strings are Dutch.
- Data stays ISO for dates and numbers; format as `nl-NL` only at render.
- Prose is Dutch in the product and English in the repository docs. Sentence case, straight quotes, no em dashes.

## 7. How to add or change data

1. Edit the workstream or entity file that states the fact. Add the source record and the provenance entry.
2. Run `bun run merge` and `bun run validate`. The merge collects sources into `data/sources.json`, maps each source to a license, and regenerates `ATTRIBUTION.md`.
3. Check the license against `research/O-licenses.md`. A source whose reuse right is not established keeps `unknown` and carries a named gap with its endpoint. Do not guess a license.
4. Run `bun test`.
5. Open a data pull request that links each source and states the counts that changed.

## 8. How to add a source

- Add a `src:` record with a stable id, a URL, a title, a publisher, a type (`wet`, `kb`, `api`, `page`, `news`, or `register`), and the `retrieved` date in ISO 8601.
- Reference it from the fact with the id, the same retrieval date, and a confidence of `high`, `medium`, or `low`.
- The reuse license is applied by `pipelines/licenses.mjs` from the determination in `research/O-licenses.md`. If the host is not covered, the record keeps `unknown` and the gap is named.
- Never add a source you did not fetch. Never paste source prose or an image without a recorded license and credit.

## 9. Run the checks

The toolchain is Bun 1.2 or newer (`.bun-version` pins 1.4.2). The root package has no dependencies and no install step. From the repository root:

```sh
bun run merge      # merge research files into data/ and regenerate ATTRIBUTION.md
bun run validate   # schema and referential integrity across data/
bun test           # pipeline tests
```

For the web app, which holds the only lockfile, `web/bun.lock`:

```sh
cd web
bun install
bun run typecheck
bun run check:contrast
bun run build
```

Next.js and tsc still run on Node.js 20.9 or newer, so `bun run typecheck` and `bun run build` need Node installed. The pipelines and tests do not. See `docs/adr/0005-bun-toolchain.md`.

A pull request does not merge while any check fails. The CI order and the link check are in `docs/10-operations-runbook.md` section 2.

## 10. Pull request expectations

- The change is small and has one purpose.
- The description says what changed, why, and how it was verified.
- The sources are linked, and every new fact resolves to a `src:` id.
- Validation, tests, and the build pass.
- No fact is unsourced, and every gap is named.
- The relevant acceptance item in `docs/08-acceptance-and-qa.md` still holds.
- A decision made along the way is written down where a later contributor will find it.

## 11. Schema changes

A schema change follows the process in `docs/04-data-model.md` section 18. A workstream proposes the field or value with a real example, the orchestrator records the decision in `research/merge-log.md`, and one commit updates the document, the schema, and the validators before any consumer uses the new field. Rerun validation over all data. A breaking change bumps the major schema version.

## 12. Corrections and conduct

- A published fact is never silently edited. A correction is logged with the old value, the new value, the date, and the reason, per `docs/09-content-and-ai-policy.md` section 8.
- Follow `CODE_OF_CONDUCT.md` in every interaction.
- Report a vulnerability through `SECURITY.md`. A wrong fact is a data-correctness issue, not a security issue.
