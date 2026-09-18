# Staatsgraaf

A public, source-backed, explorable graph of the Dutch state, modeled on the CivLab Gov Graph for the United States (https://graph.civlab.org/us). It maps the Rijk and the decentrale overheid, the positions in them, and the people who hold those positions, with every fact traced to an official source.

Staatsgraaf is the public project name. It replaces the earlier working name "NL Overheid Graph"; see `docs/adr/0003-project-name.md`.

## Status

Phases 0 to 4 are complete: recon and schema freeze, parallel research, the merged dataset, the web app, and QA. Phase 5 (launch) is in progress.

- The web app is built and produces a static export from `web/`.
- The dataset snapshot is `2026-09-18` (`data/meta.json`).
- The public site URL is not live yet. The domain and `NEXT_PUBLIC_SITE_URL` are pending, so canonical URLs are omitted rather than guessed.
- The nightly refresh is planned. The workflow is not committed yet, so the cadence is not live.
- The repository is not public yet. The public repository URL and correction address are pending and named as gaps.

## Every fact has a source

Every non-trivial fact carries a source URL, a retrieval date, and a confidence value. The rule is fetch, never recall: no value is written from memory. When a source cannot be reached, the pipeline records a named gap with the endpoint instead of a value. A wrong fact is corrected with a new dataset commit and a changelog entry, never with a silent edit.

Language models may compress, rewrite, and link facts that a source states. They may not add a fact a source does not state. Every description and summary is reviewed against its source. See `docs/09-content-and-ai-policy.md`.

## Where the data and the research live

- `data/` is the merged dataset and the single source of truth. `data/sources.json` holds every source URL with its retrieval metadata, and `data/meta.json` holds the snapshot date, the counts, and the licenses.
- `research/` holds the per-workstream output, the raw fetched snapshots under `research/raw/`, the merge decisions in `research/merge-log.md`, the license determination in `research/O-licenses.md`, and the QA and validation reports.
- `schema/v1/` is the frozen data contract as JSON Schema. `schema/README.md` explains the layout.

Counts in the `2026-09-18` snapshot: 1570 organizations, 1430 positions, 870 people, 1236 tenures, 225 memberships, 2338 relations, 12 topics, 36 budgets, 2226 sources, 1269 changes, and 1532 news items. `data/media.json` is empty, so no portraits ship yet.

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

The root package has no runtime dependencies and runs on Node.js 20 or newer.

```sh
npm run merge      # merge the research files into data/ and regenerate ATTRIBUTION.md
npm run validate   # validate data/ against schema/v1/ and check referential integrity
npm test           # run the pipeline tests
```

`npm run diff` derives the change feed, and `npm run research:check` runs the validator over the workstream envelopes. The link checker is `scripts/check-links.mjs`.

The web app is a separate package with its own lockfile:

```sh
cd web
npm install
npm run build      # static export in web/out
```

For local development, `cd web && npm run dev` serves the site at http://localhost:3000. See `web/README.md` for the routes, the design tokens, and the environment settings.

## Licenses

- Code: MIT. See `LICENSE`.
- Dataset, descriptions, and summaries: CC BY 4.0. See `LICENSE-DATA`.
- Per-source attribution and license: `ATTRIBUTION.md`, generated from `data/sources.json` by `pipelines/licenses.mjs`. The per-source determination is in `research/O-licenses.md`.

The CC BY 4.0 grant covers our own contribution: the selection, structure, compilation, descriptions, and summaries. Facts themselves are not copyrightable. On reuse you must credit Staatsgraaf, keep the source URL and retrieval date with the facts they belong to, and state the license. Where a source is all rights reserved, only the facts, the headline, and the deep link are used, not the source prose or images.

## How to cite

Cite the dataset version and the snapshot date, and cite the per-fact source with its retrieval date. Suggested shape, following `research/O-licenses.md` section 3.2:

- English: "Staatsgraaf, dataset version v1, snapshot 2026-09-18. Source: {source-url}, retrieved {YYYY-MM-DD}. Available under CC BY 4.0."
- Dutch: "Staatsgraaf, datasetversie v1, peildatum 2026-09-18. Bron: {bron-url}, geraadpleegd {YYYY-MM-DD}. Beschikbaar onder CC BY 4.0."

The repository URL and a permanent link are pending while the repository is private.

## Report a correction

A published fact is never silently edited. Every correction is logged with the old value, the new value, the date, and the reason. The correction policy is in `docs/09-content-and-ai-policy.md` section 8, and the process for a contributor is in `CONTRIBUTING.md`.

A public contact address and the public repository URL are not published yet. That is a named gap, and there is currently no public channel for a correction. Until one exists, facts with an unresolved source are shown as a gap rather than a guess.

## Independence

Staatsgraaf is an independent, open publication about the Dutch government. It is not affiliated with, endorsed by, or connected to the Dutch government or any government body. The Dutch and English statements are in `DISCLAIMER.md`.

## Known data limits

- 844 positions have no tenure with a source yet. They are mostly seat-bound roles such as raadslid, statenlid, wethouder, and gedeputeerde, plus a number of griffiers, secretarissen-generaal, and diensthoofden.
- Umbrella bodies are not modeled yet, including the VNG, IPO, Unie van Waterschappen, GGD'en, and omgevingsdiensten.
- The three Kingdom countries (Aruba, Curaçao, and Sint Maarten) and their gouverneurs and Gevolmachtigde Ministers are not modeled yet.
- `data/media.json` is empty, so there are no portraits with a recorded license and credit.
- Some source hosts refuse automated checks with a 403 response, including `www.hogeraad.nl` and `www.raadvanstate.nl`. `archiveUrl` is null on all sources; the archive lookups returned HTTP 429 and no archive URL was guessed.
- 52 people have neither a tenure nor a dated membership. Their start date is not published by the source, so they stay as named gaps.
- Topic records carry no `sources` field in the v1 schema. Their provenance is in the research envelope and markdown, and a schema change is proposed for v1.1.
- Search disambiguation is incomplete: there is no `Den Haag` alias, and bare `Utrecht` and `Groningen` resolve to a single entity. Position aliases are not supported by the v1 position schema.
- The change feed does not classify memberships of large colleges yet.

These limits are named, not filled with an assumption. The full list, by phase, is in `research/merge-log.md` and `research/validation-report-phase4.md`.

## Contributing and security

Read `CONTRIBUTING.md` before opening a pull request. Report a vulnerability through the path in `SECURITY.md`, and follow `CODE_OF_CONDUCT.md` in every interaction.

## Documentation

`AGENTS.md` routes a task to the right document. `docs/00-index.md` is the map of the set. The phase model is in `docs/07-workflow-and-roadmap.md`, and the acceptance gate is in `docs/08-acceptance-and-qa.md`.
