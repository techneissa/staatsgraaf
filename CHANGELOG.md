# Changelog

All notable changes to Staatsgraaf are recorded here. The format follows Keep a Changelog. The dataset schema follows the process in `docs/04-data-model.md` section 18; data conflict decisions are in `research/merge-log.md`.

## [Unreleased]

### Added

- The graph rebuild plan (`docs/13-graph-rebuild-plan.md`) and ADR 0015: the canvas moves from the reference's single ring system to constitutional poles around the electorate, gains a motion model (turn, gather, step back), a build-time layout, dated relations, election and coalition data, and a Tweede Kamer hemicycle. Geometry variants are compared on rendered SVGs before the layout is chosen; pending owner decisions are listed in the plan. Phase 0 shipped the schema (dated relations, elections, coalitions) and phase 1 the variant renders in `research/graph-variants/` (nine layouts, two hemicycles, computed overlap and edge criteria).
- A rebuilt budget overview at `/begroting/`. Each ministry tile gains a factual one-line description taken from the sourced organization record, last year's budgeted spending in small type beneath the current figure, the colour-coded percentage change against that year, the ministry's share of the total budgeted spending, and `^1`-style footnote markers that link to a numbered source list at the bottom of the page (`web/components/budget/footnote-marker.tsx`, `web/components/budget/source-footnotes.tsx`, `web/lib/budget.ts`).
- Weekly link-check workflow, a dataset contract check in CI and every deploy workflow, and the public correction path on the method page.

### Fixed

- News card summaries no longer repeat their own headline. The linked summaries stored as "Kop — inleiding" are cut to the article text before rendering (`stripTitleFromMarkup`), and fallback summaries that hold nothing beyond the publisher echo ("Trouw bericht: \"Kop\"") are suppressed or reduced to their article text (`stripPublisherPrefix` in `web/lib/news-text.ts`). Image credit lines are removed from the news cards; photo attribution stays in the accessible portrait labels.
- The "Wie is verbonden?" tab on person, position and organization pages now lists connections again. Because no relation touches a person directly, the tab derives positions from tenures and memberships from `data/tenures.json` and `data/memberships.json` and shows them as the new groups "Bekleedt positie"/"Positie" and "Lid van"/"Lidmaatschap" (`web/lib/entity.ts`, `web/components/entity/entity-connections.tsx`).

### Added

- A bilingual interface. The top bar gains an NL/EN toggle (`web/components/language-toggle.tsx`); the stored choice re-renders the interface in English or Dutch after hydration (ADR 0008). Dictionaries are split per build area under `web/lib/i18n/`, and entity names stay Dutch in both languages.
- A power map callout on the Who's in the news strip. Hovering or focusing a portrait reveals the name and a button that switches the right canvas to the machtskaart focused on that person's constellation, via the existing `staatsgraaf:focus` canvas event.
- A budget section on the homepage: fiscal tiles with year-over-year indicators and an Explore budget entry linking to `/begroting/`.
- Colour-coded branches. Eleven sector tokens in `shared/tokens.json` (regenerating `web/app/generated/tokens.css`) colour the graph canvas: tinted sector wedges, curved branch labels along the arcs, branch-coloured glyphs, an orange sunburst hub for Kiesgerechtigden Nederland, arrow-tipped neighbour edges on selection, a shape-and-branch legend, and zoom controls bottom-left (`web/components/graph/`, `web/lib/branch-colors.ts`).
- A rebuilt machtskaart: portrait cards on an axis-symmetric double-tree layout with links back to a centre card, portraits ringed by the official party colour, recency and article-count badges, and every card linking to its person page. Entity pages scope the map to the people co-mentioned in the news; `web/scripts/build-graph.mjs` emits the per-entity rankings and a person-slug index in `graph.json` (`bundle.schema` unchanged, two new optional fields).
- Sourced party colours. Every party in the dataset got its official hex with the source, retrieval date and confidence (`web/lib/parties.ts`, `research/party-colours-2026-09-18.md`, ADR 0009); `partijloos` and splinter factions have no sourced colour and render neutral. `web/components/party-badge.tsx` renders the dot, abbreviation and a link to the party's website or Wikipedia entry. The party-values audit also established that PRO is Progressief Nederland (the 2026 GroenLinks-PvdA fusion) and NSC links `nieuwsociaalcontract.nl`, not `nsc.nl`.

### Changed

- The home page is rebuilt as a dashboard: hero band, latest news with a read-more link, an overlapping-portrait strip of who is in the news, a change feed with 7D/30D/90D tabs, three stat tiles (vacant seats, acting officials, last change), a timeline histogram with count bubbles, and a compact overview row (`web/app/page.tsx`, `web/components/home/`).
- Change cards use coloured kind badges: appointment orange, departure red, vacancy grey, structural blue, handover purple, rename and move teal. OUT/IN rows show the successor linked with portrait.
- Entity pages (organisaties, personen, posities) restructured into a dashboard: header with branch-coloured chips, tabs "Nieuws" and "Wie is verbonden?", connection groups styled as card grids ("Gekozen door", "Benoemt", "Geadviseerd door") with icons and seat-count lines from `seatsAppointed`, a right rail with the fact grid, and party badges on person cards and member lists. Listing pages gained branch accent bars and party dots.
- News cards restyled to the reference look: emphasized titles, date under the title, clamped summary, outlet source pill with an external arrow, image tile on the right, and a small language tag for EN-language items. Topic pages show branch-coloured responsible-org chips; budget pages use stat-tile styling with a green-up red-down change indicator.
- The news, topics and budget area matches the bilingual dictionary pattern (`web/lib/i18n/dict-news.ts`), and `components/party-badge.tsx` joins the shared component set.

- Live official sources for office holders and the parliaments. `pipelines/refresh-official.mjs` refetches the Rijksoverheid bewindspersonen page, the Tweede Kamer OData gegevensmagazijn, and the Eerste Kamer leden page, and writes workstream P envelope `research/P-live-ambtsdragers.json`. Merge gives a P tenure or membership the live tier only when it changes a substantive field, so a nightly no-op does not churn the legal source on an unchanged tenure. An absent holder closes the open record with the retrieval date. `research/qa/refresh-official-18-09-2026.md` records the first run: 28 bewindspersonen, 150 Tweede Kamerleden, 75 Eerste Kamerleden, every id reused, 0 closures.
- A news feed registry and a bilingual news section. `pipelines/feeds.json` lists fourteen outlets with kind, language, rights note, HTTP status, and date. Items now carry `language`, `publisherKind`, and `keywords`. The section ships Dutch routes `/nieuws/`, `/nieuws/[date]/`, `/nieuws/bronnen/` and English routes `/news/`, `/news/[date]/`, `/news/sources/`, with translated interface strings in `web/lib/news-i18n.ts` (ADR 0007).
- Phase 5 launch preparation: `LICENSE` (MIT), `LICENSE-DATA` (CC BY 4.0), and `ATTRIBUTION.md`, generated from `data/sources.json` with every source grouped by license. `data/meta.json` records the licenses.
- The root governance files: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and a rewritten `README.md`.
- Portraits across the app. `web/components/entity/person-portrait.tsx` is the one renderer for a person photo with its credit; it is used on person cards, seat grids, member lists, tenure timelines, the acting list on the change feed, the home strip, news entity chips and inline person tags in news summaries. 330 of the 867 people have a licensed portrait; the others show initials. Search results carry the portrait for person records.
- News preview tiles. Every news card and item shows a preview: the article image when a feed grants an image license, otherwise the portrait of a linked person, otherwise the publisher monogram (`web/components/news/news-preview.tsx`, `web/lib/news-preview.ts`).
- Feed image previews and a relationships legend (ADR 0010). The news pipeline stores the feed-supplied image URL as `imageUrl` on every item, and the preview tile falls back to it when no licensed image exists, loaded from the outlet's own servers with `referrerPolicy="no-referrer"` and a "Beeld: {publisher}" credit line (`pipelines/news.mjs`, `web/components/news/news-view.ts`, `schema/v1/news-item.schema.json`). The graph legend dropdown gains a "Relaties" section that shows the line and arrow style each relationship type is drawn with, matching the per-type dash and colour the canvas now draws, plus counts; the shapes section is retitled "Entiteiten" (`web/components/graph/edge-styles.ts`, `web/components/canvas-controls.tsx`).
- News sections on person and position pages. `web/components/news/news-panel.tsx` now renders under "In het nieuws" when the entity has linked articles.
- Index routes for browsing: `/personen/` grouped by letter, `/posities/` grouped by type, and `/organisaties/` grouped by branch, all linked from the top bar and listed in the sitemap.
- The graph layout is documented and guarded. `web/lib/graph-layout.md` specifies layout `nl-sectors-v3` and the machtskaart layout; `web/lib/graph.test.mjs` and `web/lib/power-map-layout.test.mjs` fail the build when glyphs, labels, or machtskaart cards overlap, when a glyph enters the hub, or when labels leave the viewBox. `pipelines/news.mjs` stores an article image only when the feed's `imageLicense` allows it and registers it in `data/media.json`; `pipelines/portraits.mjs` gained `--new-only`, `--max-new`, and `--prune` for cheap nightly runs.
- A fast deploy path. `.github/workflows/deploy.yml` runs on every push to `main` and on demand: it validates the committed dataset, tests, builds, and deploys without refetching office holders or news, so a code or data change reaches production in about a minute instead of waiting for the nightly or six-hourly run. All deploy workflows now cache the Bun package store and the Next.js build directory (`.github/workflows/refresh.yml`, `news.yml`, `deploy.yml`), which shortens the build because Next invalidates only the pages whose inputs changed.

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
