# Staatsgraaf

A public, source-backed, explorable graph of the Dutch state, modeled on the CivLab Gov Graph for the United States (https://graph.civlab.org/us). It maps the Rijk and the decentrale overheid, the positions in them, and the people who hold those positions, with every fact traced to an official source.

Staatsgraaf is the public project name. It replaces the earlier working name "NL Overheid Graph"; see `docs/adr/0003-project-name.md`.

## Status

Phases 0 to 4 are complete: recon and schema freeze, parallel research, the merged dataset, the web app, and QA. Phase 5 (launch) is in progress.

- The web app is built and produces a static export from `web/`.
- The dataset snapshot is `2026-09-18` (`data/meta.json`).
- The site is live at https://staatsgraaf.pages.dev. `NEXT_PUBLIC_SITE_URL` falls back to that URL, so canonical, `robots.txt`, and `sitemap.xml` carry absolute URLs.
- The nightly refresh workflow is committed (`.github/workflows/refresh.yml`) and scheduled for 03:00 UTC. A green run from GitHub Actions is not yet confirmed.
- The repository is not public yet. The public repository URL and correction address are pending and named as gaps.

## Every fact has a source

Every non-trivial fact carries a source URL, a retrieval date, and a confidence value. The rule is fetch, never recall: no value is written from memory. When a source cannot be reached, the pipeline records a named gap with the endpoint instead of a value. A wrong fact is corrected with a new dataset commit and a changelog entry, never with a silent edit.

Language models may compress, rewrite, and link facts that a source states. They may not add a fact a source does not state. Every description and summary is reviewed against its source. See `docs/09-content-and-ai-policy.md`.

## Where the data and the research live

- `data/` is the merged dataset and the single source of truth. `data/sources.json` holds every source URL with its retrieval metadata, and `data/meta.json` holds the snapshot date, the counts, and the licenses.
- `research/` holds the per-workstream output, the raw fetched snapshots under `research/raw/`, the merge decisions in `research/merge-log.md`, the license determination in `research/O-licenses.md`, and the QA and validation reports.
- `schema/v1/` is the frozen data contract as JSON Schema. `schema/README.md` explains the layout.

Counts in the `2026-09-18` snapshot: 1571 organizations, 1428 positions, 867 people, 1235 tenures, 225 memberships, 2338 relations, 12 topics, 36 budgets, 3197 sources, 1268 changes, and 1556 news items. `data/media.json` holds 330 licensed portraits, so 330 of the 867 people show a photo.

## Repository layout

| Path | Contents |
| --- | --- |
| `AGENTS.md` | Operating law and the route to the right document |
| `docs/` | The documentation set; start at `docs/00-index.md` |
| `docs/adr/` | Architecture decision records |
| `data/` | The merged, normalized JSON dataset |
| `research/` | Workstream output, raw snapshots, merge log, QA reports |
| `schema/v1/` | The JSON Schema contract |
| `pipelines/` | Merge, diff, news, license mapping, and their tests |
| `scripts/` | The validator, the link checker, and the seed script |
| `shared/` | The cross-client contract and the design tokens |
| `web/` | The Next.js client; static export |
| `web/lib/graph-layout.md` | The documented graph layout both clients follow |

## How to run the pipelines and the web app

The toolchain is Bun 1.2 or newer; `.bun-version` pins 1.4.2. Bun installs packages, runs scripts and tests, and executes the pipelines, the validator, and the web build scripts. The root package has no dependencies, so it has no lockfile and no install step.

```sh
bun run merge      # merge the research files into data/ and regenerate ATTRIBUTION.md
bun run validate   # validate data/ against schema/v1/ and check referential integrity
bun test           # run the pipeline tests
```

`bun run diff` derives the change feed, and `bun run research:check` runs the validator over the workstream envelopes. The link checker is `bun run check-links`. Any pipeline also runs directly, for example `bun pipelines/news.mjs` or `bun scripts/validate.mjs --research`.

The web app is a separate package with the only lockfile, `web/bun.lock`:

```sh
cd web
bun install
bun run build      # static export in web/out
```

Next.js, tsc, and Wrangler still execute on Node.js 20.9 or newer; Bun starts them through their node shebang. So Node is required for `bun run build`, `bun run dev`, `bun run typecheck`, and the deploy step, but not for the pipelines or the tests.

For local development, `cd web && bun run dev` serves the site at http://localhost:3000. See `web/README.md` for the routes, the design tokens, and the environment settings. The toolchain decision is recorded in `docs/adr/0005-bun-toolchain.md`.

## Licenses

- Code: MIT. See `LICENSE`.
- Dataset, descriptions, and summaries: CC BY 4.0. See `LICENSE-DATA`.
- Per-source attribution and license: `ATTRIBUTION.md`, generated from `data/sources.json` by `pipelines/licenses.mjs`. The per-source determination is in `research/O-licenses.md`.

The CC BY 4.0 grant covers our own contribution: the selection, structure, compilation, descriptions, and summaries. Facts themselves are not copyrightable. On reuse you must credit Staatsgraaf, keep the source URL and retrieval date with the facts they belong to, and state the license. Where a source is all rights reserved, only the facts, the headline, and the deep link are used, not the source prose or images.

## How to cite

Cite the dataset version and the snapshot date, and cite the per-fact source with its retrieval date. Suggested shape, following `research/O-licenses.md` section 3.2:

- English: "Staatsgraaf, dataset version v1, snapshot 18-09-2026. Source: {source-url}, retrieved {YYYY-MM-DD}. Available under CC BY 4.0."
- Dutch: "Staatsgraaf, datasetversie v1, peildatum 18-09-2026. Bron: {bron-url}, geraadpleegd {YYYY-MM-DD}. Beschikbaar onder CC BY 4.0."

The repository URL and a permanent link are pending while the repository is private.

## Report a correction

A published fact is never silently edited. Every correction is logged with the old value, the new value, the date, and the reason. The correction policy is in `docs/09-content-and-ai-policy.md` section 8, and the process for a contributor is in `CONTRIBUTING.md`.

A public contact address and the public repository URL are not published yet. That is a named gap, and there is currently no public channel for a correction. Until one exists, facts with an unresolved source are shown as a gap rather than a guess.

## Independence

Staatsgraaf is an independent, open publication about the Dutch government. It is not affiliated with, endorsed by, or connected to the Dutch government or any government body. The Dutch and English statements are in `DISCLAIMER.md`.

## Known data limits

- 843 positions have no tenure with a source yet. They are mostly seat-bound roles such as raadslid, statenlid, wethouder, and gedeputeerde, plus a number of griffiers, secretarissen-generaal, and diensthoofden.
- Umbrella bodies GGD'en and omgevingsdiensten are not modeled yet. The VNG, IPO, and Unie van Waterschappen are modeled.
- The three Kingdom countries (Aruba, Curaçao, and Sint Maarten) and their gouverneurs and Gevolmachtigde Ministers are not modeled yet.
- 537 of the 867 people have no portrait. The 330 portraits that ship come from Wikimedia Commons with a recorded license and credit; the rest stay a named gap (`research/qa/portraits-18-09-2026.md`). News cards carry no article image because no outlet grants an image license; they fall back to a linked person's portrait or the outlet's monogram.
- Some source hosts refuse automated checks with a 403 response, including `www.hogeraad.nl` and `www.raadvanstate.nl`. The live dataset carries a `web.archive.org` `archiveUrl` for nine of those sources; the remaining sources have `archiveUrl` null and no archive URL was guessed.
- 52 people have neither a tenure nor a dated membership. Their start date is not published by the source, so they stay as named gaps.
- Topic records carry no `sources` field in the v1 schema. Their provenance is in the research envelope and markdown, and a schema change is proposed for v1.1.
- Search disambiguation depends on the curated overlay in `web/data/search-aliases.json`: `Den Haag`, `Utrecht`, and `Groningen` resolve there, but the merged organization records still lack the plain terms. Position aliases are not supported by the v1 position schema.
- The change feed does not classify memberships of large colleges yet.

These limits are named, not filled with an assumption. The full list, by phase, is in `research/merge-log.md` and `research/validation-report-phase4.md`.

## Contributing and security

Read `CONTRIBUTING.md` before opening a pull request. Report a vulnerability through the path in `SECURITY.md`, and follow `CODE_OF_CONDUCT.md` in every interaction.

## Documentation

`AGENTS.md` routes a task to the right document. `docs/00-index.md` is the map of the set. The phase model is in `docs/07-workflow-and-roadmap.md`, and the acceptance gate is in `docs/08-acceptance-and-qa.md`.
