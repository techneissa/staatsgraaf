# Changelog

All notable changes to Staatsgraaf are recorded here. The format follows Keep a Changelog. The dataset schema follows the process in `docs/04-data-model.md` section 18; data conflict decisions are in `research/merge-log.md`.

## [Unreleased]

### Added

- Phase 5 launch preparation: `LICENSE` (MIT), `LICENSE-DATA` (CC BY 4.0), and `ATTRIBUTION.md`, generated from `data/sources.json` with all 2226 sources grouped by license. `data/meta.json` records the licenses.
- The root governance files: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and a rewritten `README.md`.

### Changed

- The owner accepted code MIT and dataset CC BY 4.0 on 2026-09-18, recorded in `docs/adr/0001-licenses.md`.
- The public name is Staatsgraaf, replacing the working name "NL Overheid Graph", recorded in `docs/adr/0003-project-name.md`.

Still open for launch: the public URL and domain, the nightly refresh workflow, the public correction address, and the public repository URL. `archiveUrl` is null on all sources because the archive lookups returned HTTP 429.

## [Phase 4] - 2026-09-18

### Added

- QA and hardening across five areas in `research/qa/`: link check, fixtures and aliases, accessibility, a thirty-fact data audit, and performance and provenance.
- An independent validation snapshot in `research/validation-report-phase4.md`.

### Fixed

- Broken and stale source links (`src:dji-organisatie`, the Scheldestromen source, the Van de Stadt tenure start, and the province-to-gemeente `oversees` relations).
- Accessibility and interaction issues: mobile navigation as a native disclosure, a visible focus ring on tabpanels, graph Enter opening the organisation page, the graph list alternative naming edges, topic news capped at 12 with an explicit count, and the light ink-faint contrast raised to `#66645D`.

### Changed

- The Phase 4 gate passed with a Wave 2 carry. The alias-aware search overlay and the dataset and license surface were scheduled to the launch wave, and the rebuilt export reached 3904 pages with 0 broken internal links.

## [Phase 3] - 2026-09-18

### Added

- The web app renders the merged dataset: homepage, organisation, position, and person pages, topic and budget pages, the change feed, the graph explorer, and the power map.
- `pipelines/changes.mjs` derives 1269 changes and `pipelines/news.mjs` writes 1532 news items with 421 high-confidence entity links.
- `docs/adr/0002-graph-and-change-semantics.md` records the graph, change-feed, and vacancy semantics.

### Changed

- 55 pipeline tests pass and the static export builds.

## [Phase 2] - 2026-09-18

### Added

- The merged dataset in `data/`: 1570 organizations, 1430 positions, 870 people, 1236 tenures, 225 memberships, 2338 relations, 12 topics, 36 budgets, and the source records, totaling 8421 records at the merge.
- An alias gazetteer of 5694 aliases, built from workstream J and the entity set.
- An independent validator report in `research/validation-report.md` with 0 FAIL.

### Changed

- The schema additions `uitvoeringsorganisatie` and `veiligheidsregio` were confirmed.
- Budget records are keyed by organization and fiscal year, keeping all 36 records.
- `docs/05-research-workstreams.md` was amended for the study workstreams and `docs/08-acceptance-and-qa.md` for the dated-role acceptance rule.

## [Phase 1] - 2026-09-18

### Added

- The 15 research workstreams A to O, each with a JSON file and a markdown report, covering the regering and ministeries, rijksdiensten, ZBO's en RWT's, parlement, rechterlijke macht, hoge colleges en adviescolleges, decentraal, legal mapping, personen, nieuws en koppeling, topics, begroting, and the design, reference, and license studies.
- Raw snapshots under `research/raw/`.

## [Phase 0] - 2026-09-17

### Added

- Endpoint verification in `research/00-endpoints.md` and a state snapshot in `research/00-phase0-snapshot.md`.
- The frozen schema in `schema/v1/`, the validator `scripts/validate.mjs`, and the shared contract in `shared/`.
- A seed dataset for the current kabinet, the ministeries, and the parlement.

### Fixed

- The Dilan Yeşilgöz-Zegerius title was corrected from a misparse that read "viceminister-president".
- The Eerste Kamer fractie parse was corrected for 75 memberships.
