# Changelog

All notable changes to Staatsgraaf are recorded here. The format follows Keep a Changelog. The dataset schema follows the process in `docs/04-data-model.md` section 18; data conflict decisions are in `research/merge-log.md`.

## [Unreleased]

### Added

- Live official sources for office holders and the parliaments. `pipelines/refresh-official.mjs` refetches the Rijksoverheid bewindspersonen page, the Tweede Kamer OData gegevensmagazijn, and the Eerste Kamer leden page, and writes workstream P envelope `research/P-live-ambtsdragers.json`. Merge gives a P tenure or membership the live tier only when it changes a substantive field, so a nightly no-op does not churn the legal source on an unchanged tenure. An absent holder closes the open record with the retrieval date. `research/qa/refresh-official-18-09-2026.md` records the first run: 28 bewindspersonen, 150 Tweede Kamerleden, 75 Eerste Kamerleden, every id reused, 0 closures.
- A news feed registry and a bilingual news section. `pipelines/feeds.json` lists fourteen outlets with kind, language, rights note, HTTP status, and date. Items now carry `language`, `publisherKind`, and `keywords`. The section ships Dutch routes `/nieuws/`, `/nieuws/[date]/`, `/nieuws/bronnen/` and English routes `/news/`, `/news/[date]/`, `/news/sources/`, with translated interface strings in `web/lib/news-i18n.ts` (ADR 0007).
- Phase 5 launch preparation: `LICENSE` (MIT), `LICENSE-DATA` (CC BY 4.0), and `ATTRIBUTION.md`, generated from `data/sources.json` with every source grouped by license. `data/meta.json` records the licenses.
- The root governance files: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and a rewritten `README.md`.
- Portraits across the app. `web/components/entity/person-portrait.tsx` is the one renderer for a person photo with its credit; it is used on person cards, seat grids, member lists, tenure timelines, the acting list on the change feed, the home strip, news entity chips and inline person tags in news summaries. 330 of the 867 people have a licensed portrait; the others show initials. Search results carry the portrait for person records.
- News preview tiles. Every news card and item shows a preview: the article image when a feed grants an image license, otherwise the portrait of a linked person, otherwise the publisher monogram (`web/components/news/news-preview.tsx`, `web/lib/news-preview.ts`).
- News sections on person and position pages. `web/components/news/news-panel.tsx` now renders under "In het nieuws" when the entity has linked articles.
- Index routes for browsing: `/personen/` grouped by letter, `/posities/` grouped by type, and `/organisaties/` grouped by branch, all linked from the top bar and listed in the sitemap.
- The graph layout is documented and guarded. `web/lib/graph-layout.md` specifies layout `nl-sectors-v3` and the machtskaart layout; `web/lib/graph.test.mjs` and `web/lib/power-map-layout.test.mjs` fail the build when glyphs, labels, or machtskaart cards overlap, when a glyph enters the hub, or when labels leave the viewBox. `pipelines/news.mjs` stores an article image only when the feed's `imageLicense` allows it and registers it in `data/media.json`; `pipelines/portraits.mjs` gained `--new-only`, `--max-new`, and `--prune` for cheap nightly runs.

### Changed

- The project, package, and storage names are Staatsgraaf everywhere: `package.json` names `staatsgraaf` and `staatsgraaf-web`, the theme key `staatsgraaf-theme`, the canvas event `staatsgraaf:focus`, the license credit lines, and the kickoff prompt `STAATSGRAAF-PROMPT.md`. Readers who chose a theme before this change see the default theme once and choose again.
- Dates in documents are written as dd-MM-YYYY (AGENTS.md rule 8). The markdown under `docs/` and `research/` was converted with `scripts/format-dates.py`, and CI now fails a pull request that leaves an ISO date in checked prose. Data files, ids, URLs, and quoted data values keep ISO 8601. Generated `ATTRIBUTION.md` and the frozen snapshots under `research/raw/` are excluded on purpose: they quote data values.
- The owner accepted code MIT and dataset CC BY 4.0 on 18-09-2026, recorded in `docs/adr/0001-licenses.md`.
- The public name is Staatsgraaf, replacing the working name "NL Overheid Graph", recorded in `docs/adr/0003-project-name.md`.
- The toolchain moved from npm and Node to Bun for packages, scripts, tests, and pipelines. Next.js is still built on Node. `web/bun.lock` is the only lockfile and the `package-lock.json` files are gone. Decided on 18-09-2026, recorded in `docs/adr/0005-bun-toolchain.md`.
- The nightly and six-hourly refreshes are wired: `.github/workflows/refresh.yml` runs official refresh, merge, news, changes, validate, test, build, deploy; `.github/workflows/news.yml` runs the news half every six hours. Both were still named as open in the Phase 5 notes and are now present.
- The regenerated dataset holds 1571 organisations, 1428 positions, 867 people, 1235 tenures, 225 memberships, 2338 relations, 12 topics, 36 budgets, 1268 changes, 1556 news items over a thirty-day window, 3197 sources, and 330 licensed portraits in `data/media.json`.

### Fixed

- The graph no longer overlaps. Layout `nl-sectors-v1` packed glyphs by a fixed spacing and drew every sector label on one radius, so glyphs, capsules, and labels ran into each other. Layout `nl-sectors-v3` sizes every ring by the real glyph footprints, clears the hub, gives each sector label its own radius outside the glyph field, and pushes the viewBox to fit. Verified in a headless browser over the rendered SVG: zero glyph-glyph, glyph-hub, label-glyph, and label-label ink overlaps.
- The machtskaart no longer overlaps. Portraits, names, and job lines were drawn on golden-angle positions with no collision handling. The layout now separates every card deterministically, truncates long labels on the canvas with the full text in the tooltip and the screen-reader list, and sizes the viewBox to the result. Verified in the browser: zero card overlaps.
- The methodiek page no longer claims `data/media.json` is empty and no portraits exist, and the count of never-tenured positions is corrected to 843.

Still open for launch: the public URL and domain, the public correction address, and the public repository URL. `archiveUrl` is null on all sources because the archive lookups returned HTTP 429.

## [Phase 4] - 18-09-2026

### Added

- QA and hardening across five areas in `research/qa/`: link check, fixtures and aliases, accessibility, a thirty-fact data audit, and performance and provenance.
- An independent validation snapshot in `research/validation-report-phase4.md`.

### Fixed

- Broken and stale source links (`src:dji-organisatie`, the Scheldestromen source, the Van de Stadt tenure start, and the province-to-gemeente `oversees` relations).
- Accessibility and interaction issues: mobile navigation as a native disclosure, a visible focus ring on tabpanels, graph Enter opening the organisation page, the graph list alternative naming edges, topic news capped at 12 with an explicit count, and the light ink-faint contrast raised to `#66645D`.

### Changed

- The Phase 4 gate passed with a Wave 2 carry. The alias-aware search overlay and the dataset and license surface were scheduled to the launch wave, and the rebuilt export reached 3904 pages with 0 broken internal links.

## [Phase 3] - 18-09-2026

### Added

- The web app renders the merged dataset: homepage, organisation, position, and person pages, topic and budget pages, the change feed, the graph explorer, and the power map.
- `pipelines/changes.mjs` derives 1269 changes and `pipelines/news.mjs` writes 1532 news items with 421 high-confidence entity links.
- `docs/adr/0002-graph-and-change-semantics.md` records the graph, change-feed, and vacancy semantics.

### Changed

- 55 pipeline tests pass and the static export builds.

## [Phase 2] - 18-09-2026

### Added

- The merged dataset in `data/`: 1570 organizations, 1430 positions, 870 people, 1236 tenures, 225 memberships, 2338 relations, 12 topics, 36 budgets, and the source records, totaling 8421 records at the merge.
- An alias gazetteer of 5694 aliases, built from workstream J and the entity set.
- An independent validator report in `research/validation-report.md` with 0 FAIL.

### Changed

- The schema additions `uitvoeringsorganisatie` and `veiligheidsregio` were confirmed.
- Budget records are keyed by organization and fiscal year, keeping all 36 records.
- `docs/05-research-workstreams.md` was amended for the study workstreams and `docs/08-acceptance-and-qa.md` for the dated-role acceptance rule.

## [Phase 1] - 18-09-2026

### Added

- The 15 research workstreams A to O, each with a JSON file and a markdown report, covering the regering and ministeries, rijksdiensten, ZBO's en RWT's, parlement, rechterlijke macht, hoge colleges en adviescolleges, decentraal, legal mapping, personen, nieuws en koppeling, topics, begroting, and the design, reference, and license studies.
- Raw snapshots under `research/raw/`.

## [Phase 0] - 17-09-2026

### Added

- Endpoint verification in `research/00-endpoints.md` and a state snapshot in `research/00-phase0-snapshot.md`.
- The frozen schema in `schema/v1/`, the validator `scripts/validate.mjs`, and the shared contract in `shared/`.
- A seed dataset for the current kabinet, the ministeries, and the parlement.

### Fixed

- The Dilan Yeşilgöz-Zegerius title was corrected from a misparse that read "viceminister-president".
- The Eerste Kamer fractie parse was corrected for 75 memberships.
