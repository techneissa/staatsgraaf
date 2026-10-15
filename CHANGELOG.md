# Changelog

All notable changes to Staatsgraaf are recorded here. The format follows Keep a Changelog. The dataset schema follows the process in `docs/04-data-model.md` section 18; data conflict decisions are in `research/merge-log.md`.

## [Unreleased]

### Changed (15-10-2026, swipe back)

- The swipe back is smoother. The page leans after the finger at an even pace instead of fading, and the arrow at the left edge is a ring that fills as you swipe and turns solid when letting go will go back. Pulling back to the left before letting go cancels. On release the page leaves and the previous one slides in from the left in one motion, without the jitter the page transition caused before.

### Changed (15-10-2026, home news note)

- The line "Items in another language are machine translated." on the home page moved into an (i) beside "Recent news", with a link to how we translate.

### Added (15-10-2026, going back)

- Swipe from left to right anywhere on a page to go back on a phone or tablet. The page follows the finger, an arrow fills in at the left edge, and letting go past it (or a quick flick) opens the previous page where it was left. A shorter swipe springs back.
- On phones a round back button sits in the bottom left corner, in reach of the thumb. It steps aside while you scroll down and returns when you scroll up.
- With no previous page in the visit (a link from outside), back goes one level up: a person to the people index, an index to the home page.
- Going back slides the previous page in from the left; forward slides from the right. After the browser's own back swipe (iOS edge swipe, Safari trackpad swipe) the page does not animate a second time.

### Changed (15-10-2026, home overview)

- The home overview uses the graph's branch colours and icons. Figures and rows are links: a branch opens its group on the organisations page, a type filters that list.

### Changed (15-10-2026, change rows)

- The strip caption is a people count, not "N changes (M people) in N days". Kind words (appointment, departure, vacancy) are the source link when a source exists; the chain-link icon is gone. Portraits on the change feed open a peek.

### Fixed (15-10-2026, peek dismiss)

- Dismissing a peek no longer clicks through to the page behind. A tap on a name or a link under the overlay only closes the peek.

### Changed (15-10-2026, change English)

- Change sentences on the English site use the established English names for positions and bodies (Mayor of Wierden, Public Prosecution Service). Person names stay Dutch. The Dutch name is on the link tooltip. The strip tooltip no longer says "Select to filter the list to this day".

### Fixed (15-10-2026, change strip)

- Choosing a day on the change strip no longer scrolls the page down to the list. The filter still applies; the chart stays where it is.

### Changed (15-10-2026, change strip)

- The changes chart is a strip of dots on a 7, 30 or 90 day axis, one mark per person, coloured by kind. Quiet days stay empty. A mass departure is a cluster; a single vacancy is one hollow ring.

### Changed (15-10-2026, changes)

- The changes block drops the bordered pills: acting and vacant seats are a compact "now" row with coloured glyphs, and the kind filters are an icon plus a count. Chronological and by person are icons. The "last change today, data as of today" line is gone when those dates are the same.

### Changed (14-10-2026, organisation header)

- Organisation pages put branch, level, child count and aliases in one compact chip row, with the branch colour on its chip. The people who lead it sit on one line with small portraits, instead of a stacked list. The breadcrumb no longer repeats the name already in the heading.

### Fixed (14-10-2026, top bar)

- The top-bar controls (menu, language, search, history, theme) share one 32 px box and 16 px icons, so the row no longer mixes three icon sizes and four paddings.

### Changed (14-10-2026, news card)

- News cards mark mentioned entities with an @ instead of the word "Mentioned", and stack the date over the time so the source line stays short.
- In English, mentioned ministries and other bodies use their established English name (ADR 0012); the Dutch name is on the tooltip. The outlet name is the source link; the separate chain icon is gone.

### Changed (14-10-2026, peek description)

- The peek shows the full description instead of cutting it with an ellipsis. In English it uses the machine translation already on the entity page, with "Translated from Dutch" under it.

### Changed (14-10-2026, peek fit)

- A peek that fits in 90 % of the screen no longer opens as a shorter card with a scrollbar. "Part of" puts the parent name on the same line as the label.

### Fixed (14-10-2026, mobile scroll)

- Scrolling a list on a phone no longer hitches as the Safari URL bar shows and hides. The shell and the graph band use the small viewport height, news cards no longer skip paint with a too-short size estimate, and sticky group headers drop the backdrop blur below the lg breakpoint.

### Fixed (14-10-2026, peek swap)

- Clicking a second name while a peek is open keeps the overlay up and swaps the inner content. The card no longer closes and pops open again, and the bottom sheet no longer slides up from the edge. Tapping the same name still closes.

### Changed (14-10-2026, peek popover)

- The peek that opens from a name stacks its facts (label above value) instead of a 7 rem two-column grid that left short values floating in the middle of the card. Holder titles wrap. Seats, members and connections are a coloured icon plus the number. The close button sits on the heading, not beside the whole card. A landscape phone uses the bottom sheet.

### Fixed (13-10-2026, hydration error 418)

- Organisation pages no longer log the React hydration error #418 in the browser console. The credit line under the name (the coat of arms or logo credit with its (i) button) was a `<p>` that held a `<details>`; the HTML parser closes a paragraph at a `details`, so the page the browser built differed from the one React expected. The credit line is now a `<div>` (`web/components/entity/org-emblem.tsx`). The visible page does not change.

### Fixed (13-10-2026, favicon)

- The site has an icon (the Staatsgraaf mark, `web/app/icon.svg`); before, every first visit logged a 404 for `/favicon.ico` in the browser console. `/favicon.ico` now redirects to the icon (`web/public/_redirects`).

### Added (13-10-2026, logos round 2)

- 147 more bodies show their official logo, loaded from their own website (ADR 0029, amendment 2): zbo's such as the AFM, the KvK, the RDW, the SVB and Staatsbosbeheer, the GGD's, omgevingsdiensten and veiligheidsregio's, the Politie, the VNG, seven waterschappen, Cito, the NTR, Het Juridisch Loket, Halt, and the regeringen of Curaçao and Aruba. 1,186 of the 1,644 organisation pages now show an emblem.
- The ministries of Aruba and Curaçao show the logo of their regering, named as such.
- Named gaps stay: the rijksoverheid ministries, agentschappen and inspecties (only the shared rijkslogo), the courts (only the shared Rechtspraak logo, copyright reserved), inline SVG logos, categories of bodies and bodies without a site. 21 found images were left out: 13 do not load from another site, 7 are white logos for a dark header, and one is the bare rijkslogo. The register is `research/qa/logos-13-10-2026.md`.
- The CSP `img-src` allows any https image; the news image hosts stay listed for the news pipeline (ADR 0029, amendment 2).

### Fixed (13-10-2026, graph and panels)

- The name that appears when hovering a body in the graph wraps onto two lines instead of being cut off.
- A logo that failed to load no longer hides the logo of every body picked after it in the side panel (the Tweede Kamer sometimes showed only its colour mark).

### Changed (13-10-2026, organisations index, second redesign)

- The organisations index opens with an overview of the state: one tile per group in the colour of its sector in the graph, with an icon, its number of bodies and one line on what it is, arranged as national, decentral, and at arm's length with the Kingdom. A tile jumps to its group.
- Each group has a heading band in its colour with its icon and count, and lists its bodies as compact cards. Every card has a visual: the coat of arms, else an icon for the type of body in the colour of the group. Official logos stay on the organisation page (too small to read in a card), so the index loads nothing from other sites. A card shows the name and at most one meta element (the folded parts, else the seats); the leader line, the type word and the "Toon alle" folds are gone.
- The gemeenten are grouped by provincie (from the `oversees` relation), with the samenwerkingsverbanden, veiligheidsregio's and the VNG under "Samenwerking tussen gemeenten"; the zelfstandige organen are grouped by their ministerie. Each subgroup is a tile with its arms or ministry icon and count that opens its cards. The ministries of Aruba, Curaçao and Sint Maarten fold under their regering (`part_of`).

### Changed (13-10-2026, organisations index)

- The organisations index lists one compact row per body instead of tall cards, in a grid that follows the width of its column (1 column, 2 from 576 px, 3 from 896 px). Child bodies (a gemeenteraad, college or commissie under its gemeente, committees under a Kamer, agencies under a ministry) fold under their parent row behind "N onderdelen". Groups with more than 24 rows show 8 main bodies and "Toon alle N". Search still finds every body. Rows show the local coat of arms where one is on record. The page is 7.3 thousand px long at 1440 px instead of 133 thousand.

### Added (13-10-2026, embedded official logos)

- 28 national bodies without a licensed emblem show their official logo, loaded from their own website and never copied (ADR 0029, amendment 1): among them the Tweede Kamer, the Algemene Rekenkamer, the Kiesraad, the Openbaar Ministerie, the Belastingdienst and the Nationale ombudsman. The (i) says no licence is claimed and links the page the logo comes from. The 18 Rechtspraak courts get a link only (copyright reserved, Staatscourant 2024, 5153).
- New field `logoEmbed` on organisations (schema, `docs/04-data-model.md` section 3); the embed hosts are in the `img-src` of `web/public/_headers`, checked by `web/lib/csp.test.mjs`.
- Organisation pages on phones: the name is a size smaller and the emblem sits in the credit line under it, so long names keep whole words.

### Changed (13-10-2026, news cards)

- The date and the translation toggle of a news card sit at the right edge of the card, under the thumbnail, instead of in the text column.

### Added (13-10-2026, coats of arms)

- 320 organisation pages show the official coat of arms next to the name: the 12 provincies, 293 gemeenten, 12 waterschappen, Bonaire, Saba and Sint Eustatius (ADR 0029). Each comes from Wikimedia Commons with a verified free licence and a named source; the credit and the licence are visible under the name, with the (i) for author, licence and source page. Alt text: "Wapen van {naam}".
- Public-domain arms are served as a 240 px high WebP rendered from the checked SVG (`web/public/media/wapens/`); Bonaire (CC BY-SA 4.0) is served as the unchanged original. Records: `type: "logo"` in `data/media.json`, a Commons source per file in `data/sources.json`, and `images` on the organisation.
- Named gaps: the Rijksoverheid ministries and agencies, the Kiesraad, the Algemene Rekenkamer, Defensie, the Openbaar Ministerie and all Rechtspraak courts (their own sites or Staatscourant 2024, 5153 restrict the logos), plus bodies with no file on Commons. 69 rows wait for an owner decision, among them the Tweede Kamer, the Eerste Kamer, the Hoge Raad and 47 gemeenten. Arms drawn by the Commons uploader ("own work") ship by owner decision of 13-10-2026 (54 gemeenten). The register is `research/qa/logos-13-10-2026.md`; party logos (ADR 0011) are unchanged.

### Changed (13-10-2026, translation model)

- News and description translations use Claude Haiku 5.5 at effort medium through OpenCode instead of DeepSeek V4.1 Flash (ADR 0028, amending ADR 0016). `opencode` (the OpenCode key) is the default pay-as-you-go endpoint; the OpenCode Go subscription is used only when named with `--provider opencode-go`.
- The DeepSeek news translations are translated again with `--replace deepseek-v4.1-flash`. Records made in a Claude Code session (claude-opus-5-5, claude-sonnet-5-5) are kept.
- Reader-facing text names no model: translated items read "Vertaald met AI" (NL) and "Translated with AI" (EN), and the method page says AI was used.
- `schema/v1/news-translation.schema.json` and `schema/v1/description-translation.schema.json` accept method `opencode-go`; the engine description names `claude-haiku-5-5`.

### Added (06-10-2026, live sources for provincies, gemeenten and waterschappen)

- `bun run live` now also reads the official sources of the decentral bodies, once a day (ADR 0027): the TOOI organisation sets (codes, end dates, herindelingen), the Register van Overheidsorganisaties (bodies, council seats, websites, office holders; CC0), the CBS table "Gebieden in Nederland" (an independent count) and the Rijksoverheid overview of the commissarissen van de Koning. Each source writes only when it agrees with the others (same codes, 342-ish gemeenten, exactly 12 provincies, 15 to 30 waterschappen, a head for at least 97 percent of the bodies); a bulk of closures needs a herindeling event or the first read.
- First run: 27 burgemeesters replaced and 29 new tenures (the Wikipedia import of 18-09-2026 was stale; six changes were checked against Rijksoverheid and municipal news and all were real), 27 people created, 9 waarnemend flags changed, 39 council sizes and 168 organisation records updated, 123 gemeenten and 6 waterschappen dated, and about 310 tenures now cite the register instead of Wikipedia. Every closure and new person is in `research/qa/live-review-queue.md`.
- Herindelingen are data events: a gemeente that TOOI ends is dissolved on its official end date with its office holders and a `succeeded_by` relation, and a new one is created with its raad, college and positions. Hilversum and Wijdemeren (announced by the Kiesraad for 01-01-2027) need no manual step.
- Named gaps: raadsleden, wethouders (implemented, off: about 2.8 thousand extra files, ADR 0022), gedeputeerden and Statenleden, the bestuur of the waterschappen, the start date of new burgemeesters, the TOOI licence statement. See the ADR.
- Wording for the method page: NL "Provincies, gemeenten en waterschappen worden dagelijks bijgewerkt uit officiële bronnen (TOOI, het Register van Overheidsorganisaties, CBS en Rijksoverheid): de lichamen, hun zetels, de burgemeesters, dijkgraven en commissarissen van de Koning. Wethouders, raadsleden, gedeputeerden en de besturen van waterschappen staan er nog niet in." EN "Provinces, municipalities and water boards are refreshed daily from official sources (TOOI, the Register of Government Organisations, CBS and Rijksoverheid): the bodies, their council seats, the mayors, dijkgraven and Commissioners of the King. Aldermen, councillors, gedeputeerden and water board councils are not in yet." The web page still carries the old sentence (`web/app/methodiek/page.tsx`); the web owner changes it.
- Code: `pipelines/decentral-parse.mjs`, `decentral-names.mjs`, `decentral-fetch.mjs`, `decentral-plan.mjs`; guards in `live-guard.mjs`; organisations, seats and source upgrades in `live-apply.mjs`; the `decentral` section of `research/P-live-state.json`; tests with real-shape fixtures in `pipelines/fixtures/decentral/`. The research is in `research/qa/live-decentral-06-10-2026.md`.

### Changed (06-10-2026, home and About)

- The intro moves from the top of the home page to a closing "Over" section at the bottom. The page and its links are renamed from "Over en methode" to "Over" ("About" in English).
- The Tweede Kamer hall seats the kabinet on the two tables the floor plan draws (a row either side of each table, along it) instead of in a block that spilled past them.
- The Eerste Kamer hall centres the kabinet bench on the chair and the aisle (it sat half a seat to the left).
- The ministries on the budget page are one ranked list with a row each (the "other ministries" roll-up is gone). A ministry's budget page and a party page now pick their entity in the graph, as organisation and person pages already did, so the graph and the side panel show what the page is about.
- Hierarchie: the lines in the wheel now meet the ring, hubs and people square on with small rounded corners, no stubs or notches, and one-seat parties keep a ring segment wide enough for their bar.
- Wheel: the Koninkrijk ring leaves a visible seam where it closes instead of running into itself; ring, group and rim labels are in normal capitalisation instead of all capitals; the centre reads "Constitution and Charter" in English, and the wheel's structural labels (branches, groups, courts) are translated.
- News: 29 enabled feeds (politics sections, official feeds from the Tweede Kamer, CPB, CBS, the Autoriteit Persoonsgegevens and the Rijksoverheid news sitemap, plus more outlets). Items that a feed drops stay for 30 days (7 for items that are not about the government), so the store no longer shrinks to what the feeds list today. Items from a politics section or an official body count as about the government by source (ADR 0021, amendment 1). The home band shows six items, at most two per outlet. See `research/qa/news-scope-06-10-2026.md`.
- A page that fails to load a script file (a tab left open across a deploy) now reloads once by itself, and a page that fails to render shows a message with a reload button instead of an empty column.
- Hierarchy: connection lines in the Kabinet, Tweede Kamer and Eerste Kamer wheels and the person focus are now soft, tapering brush strokes with a gentle bow and round ends, drawn in by a mask, with a hover halo (one shared line language, `web/lib/sketch-line.ts`). Wheel: the names of the ministries and other cells sit a few units clear of their outline.
- The Freshness section of the About page is removed, and so is the seat-order note on the About page, the seat loupe and the party panel.

### Changed (06-10-2026, the wheel is the graph)

- The graph is the wheel only. The tier map and the toggle between the two forms are gone, along with the code only the tier map used. The list of bodies for keyboard and screen readers and the "as of" note now sit on the wheel. The legend keys the wheel's ties. See `docs/adr/0015-graph-rebuild.md`, amendment 6.

### Changed (05-10-2026, UX overhaul)

- News shows items that name a real person, body, position or topic by default, with a toggle for the rest. The linker no longer links an item's own publisher, bare place names without a government cue, or topics without evidence. RTL boulevard is excluded at the feed. Day archives are linked and windowed, filters live in the URL, and the sources page shows feed status and named gaps (ADR 0021).
- The latest-changes block is a slim row of chips with a small period switch at the top right, an interactive stacked histogram, a per-person view, and dates counted from the build day. One person's changes on one day are bundled into one entry.
- The budget section has icon tiles, a ranked bar chart, a year switch and a trend chart. The net figure is labelled spending minus revenue, and the Infrastructuur en Waterstaat drop is explained with its source (research L).
- Entity pages show structure first, party pages list their people, positions state what the data says about holders, and sparse pages carry named gaps. Index lists navigate directly (ADR 0017 amendment) and load as compact JSON.
- Search tolerates typos, shows context lines, ranks Dutch records first and has `/` and Cmd+K shortcuts.
- The page shell lands navigation at the top, folds the graph on phones, and the graph zooms and pans without long tasks. Cache headers and a cheap prefetch miss are in place (ADR 0022).
- `bun run live` refetches the official sources behind consistency guards, and the scheduled workflow commits the result (ADR 0024). The repository can go public (ADR 0023).

### Changed (05-10-2026, code licence)

- The code licence moves from PolyForm Noncommercial 1.0.0 to Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0). `LICENSE` carries a short header over the unmodified legal code, and the site, `README.md`, `CONTRIBUTING.md`, `ATTRIBUTION.md`, `data/meta.json` and the package files state the new value. The dataset licence is unchanged: CC BY 4.0 (`LICENSE-DATA`). The reasons and the limits of the licence are in `docs/adr/0001-licenses.md`, amendment 05-10-2026 (second).

### Changed (05-10-2026, CivLab derivation cleanup)

- A review of the public tree against the reference product (the CivLab Gov Graph) found that shipped code and data are independent, but that two research notes and the reference spec described the reference in more detail than a public repository should hold. `research/M-design.md` and `research/N-reference-model.md` are rewritten as descriptions of observed behaviour and of our own design decisions: the class strings, colour tables, SVG details, layout constants, data records and people from the reference are gone. `docs/02-reference-system-spec.md` paraphrases the reference's copy and label lists instead of quoting them and drops its counts.
- Wording that read as copying is corrected in `docs/00-index.md`, `docs/01-vision-and-goals.md`, `docs/13-graph-rebuild-plan.md`, ADR 0015 (with a dated note), `web/lib/graph-layout.md`, this changelog and code comments. The goal is stated as learning from the reference's information architecture, not matching its look. Older entries below keep their date and meaning; only the specific phrases were reworded.
- Product overlaps removed: the sentence for a missing predecessor is our own wording, three home section headings are renamed (the meaning is kept), the light-theme neutral ramp in `shared/tokens.json` has its own values with the same roles (contrast checks pass), and the generated sunburst helper no longer claims to follow the reference's hub mark.
- Credit: `README.md`, `ATTRIBUTION.md` (through `pipelines/licenses.mjs`) and the method page now say that Staatsgraaf was inspired by the CivLab Gov Graph, thank CivLab for the idea, and state that it is independent and uses none of CivLab's code, data, text or images. `research/O-licenses.md` records CivLab as "no licence stated on the captured pages; default copyright applies; design reference only, nothing copied". The decision is `docs/adr/0026-reference-product-and-credit.md`.

### Changed (05-10-2026, public repository)

- The repository becomes public (ADR 0023). The code moves from MIT to the PolyForm Noncommercial License 1.0.0 (source-available); the dataset stays CC BY 4.0 (ADR 0001, amendment 05-10-2026). `data/meta.json`, the dataset manifest, the `/dataset/` and `/methodiek/` pages, and `CONTRIBUTING.md` state the new terms.
- Agent and prompt files, the local fetch cache `research/raw/` (except the licence evidence and the hand review under `research/raw/portraits/`), the internal plans and audits, and the operations runbook leave the repository and its history. Links to them were removed or pointed at public documents.
- One scheduled workflow (`news.yml`, every 3 hours) now runs the whole refresh, commits changed data to `main` as `github-actions[bot]`, and builds and deploys only when something changed. `refresh.yml` is removed. `deploy.yml` skips documentation-only pushes. Third-party actions are pinned to commit SHAs (ADR 0004, amendment 05-10-2026).

### Added (25-09-2026, ninth round)

- Links for the bodies that had none on either graph form (ADR 0019, workstream V). The landen of the Kingdom are tied to the Kingdom through the new Rijksministerraad, the College financieel toezicht Curaçao en Sint Maarten and the Interparlementair Koninkrijksoverleg. Their Staten are also tied to the Tweede Kamer and the Eerste Kamer on ontwerpen van rijkswet.
- The Algemene Rekenkamer and the Nationale ombudsman are tied to the regering and the Tweede Kamer. The Dienst van het Koninklijk Huis, the Kabinet van de Koning and the Kanselarij der Nederlandse Orden are tied to their ministry, and the Rijksvertegenwoordiger to the openbare lichamen, the regering and BZK.
- Every veiligheidsregio, GGD and omgevingsdienst lists the gemeenten and provincies that take part in it, with the join date from the Register van Overheidsorganisaties (898 links). The IPO lists the twelve provincies and the VNG all gemeenten.
- The wheel draws appointment, voordracht and participation ties, and has a Koninkrijk cell for bodies of the Kingdom as a whole. The Rijksvertegenwoordiger now appears in the Caribisch Nederland cell.

### Added (25-09-2026, eighth round)

- A second form of the graph, the wheel, behind the icon button at the top right of the graph (owner's own concept): the Grondwet in the centre, the national bodies in four branch wedges, the decentrale overheden and the Koninkrijk around them and the voters as the rim. Every body is a mark in its shape and colour; the Kamers are drawn as their halls. Related bodies share one background with the group's name outside it.
- Picking a body on the wheel turns the wheel so the body sits at the bottom and draws its ties: arrows for oversight, advice, accountability and elections (the voters from the rim), dashed lines for the bodies it falls under or holds. A body the wheel does not draw on its own, such as a gemeenteraad, stands in for the body it belongs to, and many ties into one group, such as a provincie's gemeenten, are one thicker bundle. Unrelated marks fade, hovering names a mark, and a caption names the selection with its number of ties.

- The wheel groups bodies in families, adapted to the Dutch state (ADR 0015 amendment 5): each ministry with the agentschappen, uitvoeringsorganisaties, inspecties, zbo's and rwt's under it, each provincie with the gemeenten it oversees, each Kamer with its commissies. At rest a family's bodies are packed small beyond its head; picking the head or one of its bodies opens that family full size, and its neighbours move aside a little. The adviescolleges, planbureaus and Kiesraad keep a wedge of their own.

- The wheel sizes and places bodies by their ties (ADR 0015 amendment 5): a body's size follows how many bodies it is tied to (its edges, its parent and the bodies under it) in three steps, so the ministries and provincies with the most bodies read as hubs; cells spread their bodies evenly over their whole area instead of bunching them in the middle; and each adviescollege and planbureau sits toward the ministry it advises.

### Fixed (25-09-2026, eighth round)

- The rings view draws the selection's ties at a fixed screen width, so they stay visible at every zoom level instead of thinning to under a pixel.

### Added (25-09-2026, seventh round)

- The Kamers in Connections are their plenary hall (ADR 0018 amendment 3): every seat where the chamber's own floor plan puts it and each seat the member who holds it, as a face where there is room and as a dot in the fractie colour where there is not. The Tweede Kamer has its benches as a dome, the voorzitter at the desk and the kabinet in vak-K facing them; the Eerste Kamer has its two bench blocks, the voorzitter between them and the regeringstafel opposite. Hover or tap a seat for the member's face and fractie; the legend lists coalition and opposition with seat counts, fractievoorzitters and the majority. The kabinet's "Kabinet" link opens the ministry chart. Phones keep the card overview, with a "Zaal / Overzicht" switch that opens the hall full screen.
- `data/chamber-plans.json` with schema `chamber-plan.schema.json`: the Eerste Kamer seat of every member from "Wie zit waar" and the Tweede Kamer seat of every fractie from the June 2026 "Zetelverdeling plenaire zaal", extracted by `research/S-zaalindeling-plans.py` (workstream S addendum). The Tweede Kamer seat per member stays a named gap.

### Changed (25-09-2026, sixth round)

- The budget radar's amount scale is a square-root scale with rings at €1, €10, €25, €50 and €75 mld: the log scale squeezed the large ministries together and overlapped the ring labels, while this one spreads €10 to €75 mld apart and keeps the smallest ministries off the centre. Ring labels never overlap. Each ministry has an icon (`web/components/icons/ministry-icon.tsx`, the same set as the Connections hierarchy) on its radar axis and on its budget card.
- Topics are in English in English mode: an English name for each of the 12 topics (`web/lib/topic-names.ts`, the project's own grouping, so not a proper name) and English descriptions through the description translations, which now cover `topics.json` too, also in the automatic CI translation.
- The budget radar's amount scale is logarithmic again, now with rings at €100 mln, €1 mld, €10 mld, €25 mld, €50 mld and €100 mld, so a large ministry reads against a nearby ring (Defensie's €23 mld sits just inside €25 mld) while the small ministries stay visible.
- The budget radar compares one, two or three years: the second and third year selectors have a "Geen / None" option, and each remaining year keeps its colour.
- The budget radar's amount scale is linear instead of logarithmic: the log scale put a €23 billion ministry close to the €100 billion ring, which read as a much larger amount. Distance from the centre is now proportional to the money, with rings at round amounts, and the share note says what the share is: a ministry's spending as part of the summed spending of the twelve ministries that year.
- The Grafiek / Verbanden switch shows two icons instead of words (orbit for the graph, people for Connections), each lit in its own colour when active, with the name as tooltip and accessible label.
- The Connections hierarchy and person focus are rebuilt after the owner's two concept images: a segmented colour ring, thick bars, outlined icon hubs and labelled members; the person between two group heads with vertical member chains and a legend. Ministries fall into six colour clusters; the canvas can go full screen on desktop.
- News: the "by day" link list is gone, the per-card "Translated from Dutch" label and "Show original" link are replaced by one translate icon per card and a single line above the list (ADR 0016 amendment 2), and the "read in English / Dutch" links at the top of the news pages are removed.
- Connections opens on a hierarchy view (ADR 0018 amendment 2): the kabinet with the minister-president in the centre, the Koning as head of state and one icon hub per ministry with its bewindspersonen; the Tweede Kamer and Eerste Kamer with the chair in the centre and fracties as hubs in party colour. Clicking a person shows their ties as portrait tiles around them. The earlier view stays under "Netwerk".
- Bewindspersonen carry their party (27 of 28, from their rijksoverheid.nl pages) and the Eerste Kamer fracties their fractievoorzitter (19 of 20, from eerstekamer.nl), carried through the nightly merge (`pipelines/party-affiliation.mjs`).
- Sources show as one small link icon everywhere instead of "Bron: ..." text; the title and retrieval date are its name and tooltip, and full source lists fold into "Bronnen (n)".
- The people index is a grid of compact cards in party colour, or a role colour for people without a party (oranje for the Koning, the branch colour otherwise), with search, group and party filters and A-Z sections.
- New contributor rule (`CONTRIBUTING.md`): no horizontal scrolling on any page from 320 px up; the top bar and the home people strip were fixed to meet it.

### Changed (25-09-2026, fifth round)

- The power map is renamed "Verbanden / Connections" and redesigned as an ego view (ADR 0018 amendment 1): the pick in the centre with its ties grouped by office, kabinet, fractie and shared news, strength as line weight and a reason on every tie; a list with a strength meter on narrow screens; a ranked overview with nothing picked. Every sitting bewindspersoon now has ties.
- Budget: the English name of each ministry leads in English mode, percentages follow the reader's language, the year and measure are stated once per section, each card shows the amount, the change, last year and a share bar, and a radar chart compares the ministries across any three years from 2013 to 2027 (share of total by default, log amounts on request, with a table view). The colours pass the colour-blind validator in light and dark mode.
- English mode: Dutch strings in English dropped from 781 to 162, the remainder being sourced names and data text; dates and numbers follow the reader's language; change rows are written in English from their structured fields. A test now fails when an English label equals the Dutch one without a reason on record.
- Repeated text is removed across the entity, index, topic, party and dataset pages. Parties are cards in a responsive grid with one legend for the Tweede Kamer and Eerste Kamer seat icons.
- Careers include undated employers and offices when Wikidata cites a reference (for example Willem-Alexander at KLM), and occupations as tags.
- The method page is now "Over / About" without the corrections section; the accessibility statement drops "What works" and "Review"; the dataset page drops "Version and snapshot" and shows its contents and downloads as cards with icons, links and counts that run up once when first seen. Section headings on these pages carry an icon, and a few controls morph between states (menu, theme, share, show more) through morphicons, instant under reduced motion.

### Changed (25-09-2026, fourth round)

- Profiles, organisations, positions and parties open with a one-line summary built from the data ("Koning der Nederlanden sinds 30 april 2013", "Ministerie in de rijksoverheid, 18 organisaties onder zich") instead of a generic sentence; the same line is the meta description.
- Facts are compact tiles with icons, side by side when there is room; duplicate facts are merged, and "no X on record" lines are gone: empty sections are hidden.
- Descriptions that only say where an entity was listed are hidden (`data/description-flags.json`), and organisation and person descriptions have an English version (ADR 0016 amendment 1, `data/description-translations.json`).
- Long sections collapse to a first view with "Toon alle", and one calm callout style marks an acting office holder, a position without a holder and a dissolved organisation.
- The phone bottom sheets can be dragged: up to expand, down to shrink or close, with the same through the handle by keyboard.
- The change figures are four icon tiles ("1 vacature", "51 waarnemend", "6 dagen geleden", appointments in 30 days) with details folded away, the same on the home page and on /wijzigingen.
- Filler text is removed from the home, news, change, index, budget and topic pages; counts on the home page follow the reader's language.

### Changed (25-09-2026, third round)

- Profiles of Tweede Kamerleden and bewindspersonen get a "Voorstellen en moties" tab: the moties, amendementen, schriftelijke vragen, wetsvoorstellen and initiatiefwetsvoorstellen they submitted or co-submitted since 06-12-2023, with the vote outcome where the data has one, the co-submitters in their party colour and a link to the item on tweedekamer.nl. Source: the Tweede Kamer Open Data gegevensmagazijn (CC0), people matched on full name and birth date (`pipelines/parliament-activity.mjs`, `data/activities.json`, 268 people). Eerste Kamer members and bewindspersonen who were never Kamerlid are named gaps in `research/qa/parliament-activity-25-09-2026.md`.
- Profiles show the date of birth and the age, with the record it came from.

- One shared selection for the whole page (ADR 0018, `web/lib/selection.ts`): the graph, the seats, the power map and both side panels read and write the same pick, with a way back.
- Side panels: the page column and a new details column beside the canvas can each be collapsed, and the details column can be dragged or keyed between 16 and 30rem; the choices are remembered. The details column is redesigned per kind of pick, with a back button, and every row picks in place. With nothing picked it lists the people most in the news, the largest sectors and the latest changes.
- The page column shows a profile of the pick at the top: description, budget for ministries, key people, news, people named with them in the news and recent changes, with back and close.
- Seats are politicians: each seat of the Tweede Kamer and the Eerste Kamer is a member, in name order within the fractie because neither chamber publishes a seat per member. Picking a fractie opens a seat loupe with faces, and from a closer zoom the seats themselves can be picked.
- Parties link to their 2025 election programme where the party's own site publishes one (`web/lib/parties.ts`, retrieved 25-09-2026); OPNL, FNP, Water Natuurlijk and Groep Markuszower are named gaps.
- The power map has a way back after picking a profile, news bubbles that draw lines to what they name, and connections between people and bodies derived from shared news items, positions, the kabinet and fracties, each with its reason and evidence ids. It now counts news up to the newest item instead of the snapshot date.
- The home overview, budget totals and change tabs reflow by the column's width: no overlapping numbers and labels. All-caps labels are sentence case across the site.

- The method page is short and plain: what the project is (a personal project that gives a neutral, sourced overview of the Dutch government, inspired by CivLab's Gov Graph), sources, freshness, a short AI section that says AI helped build the project and that news is machine translated without naming a model, corrections, licences and what is still missing, with the portrait count computed from the dataset.
- The dataset page has one short credit section with an example citation and a single line crediting the portrait sources; the credit per photo is in `media.json` in the download.
- The privacy statement says that a politician's date of birth is shown when a public source publishes it.
- The "See also" link lines at the bottom of the dataset, privacy, accessibility and party pages are gone; the footer already links there.

- Party and fractie names in member lists, seat lists and profile headers are pills in the party's own colour, linked to the party page (`web/components/party-pill.tsx`).
- Portrait credits are no longer printed under photos. The credit stays reachable from every image: as its tooltip and for screen readers, and behind a small info button next to the photo on a profile page, which keeps the attribution that CC BY and CC BY-SA require.
- The dashed majority line is gone from the Tweede Kamer and Eerste Kamer seat charts; the majority is stated in the caption.

### Changed (25-09-2026, second round)

- Portraits for 35 more people (455 of 880): Eerste Kamer members through their full names, burgemeesters matched on municipality, and former members through the Tweede Kamer Open Data archive, each matched on a second piece of evidence besides the name (ADR 0014 amendment 2). Three portraits with a disputed licence were replaced or withdrawn. The 425 remaining gaps are named in `research/qa/portraits-25-09-2026.md` and show an initials avatar.
- The graph draws no connection lines at rest. A body's connections appear only when it is selected, in the accent colour.
- Selecting a body no longer turns the canvas, so the view stays exactly where the reader left it. The turn is off by default and stays available under the ↻ button (stored under a new key, so an earlier "on" is not carried over).
- Budget amounts are short and readable: at most four significant figures with "mld" and "mln" in Dutch and "B" and "M" in English, and the exact amount in a tooltip and for screen readers (`web/lib/budget-format.ts`, `web/components/budget/amount.tsx`). Totals and ministries are cards two to a row, also on phones. The "amounts in x 1.000 euro" notes are gone because the figures are now shown in euros.
- Instruction text is removed where the design speaks for itself: the empty graph details hint, "click to unpack", the cmd-click tip, the search hint, the budget footnote explainer. Page intros are one plain sentence. Screen-reader instructions stay.
- Motion that answers the reader: pages cross-fade, a portrait moves from a list into its person page, popovers grow from their link and the phone sheet slides up, tab indicators slide, accordions open to their height, filtered news items rise in, and budget, election, seat and histogram charts grow once as they come into view. The graph settles in ring by ring once per session on the home page. Durations and curves are tokens in `web/app/globals.css`, and everything is off under reduced motion (`web/components/motion/`).

### Added (25-09-2026)

- Every news item is readable in both languages. Headlines and leads are machine translated (ADR 0016): the 1,511 items at hand were translated once in a Claude Code session, and every news run in CI now translates only new or changed items through OpenCode Zen with DeepSeek V4.1 Flash, reasoning off, with the DeepSeek API and Claude as fallbacks. Translations live in `data/news-translations.json` (schema `schema/v1/news-translation.schema.json`), are tied to their source by a hash (`shared/news-translation-hash.mjs`), keep every entity tag, and are carried between CI runs in the Actions cache. Translated cards say so, link to the new machine translation section on `/methodiek`, and show the original on request. `/news/` shows all items instead of English outlets only.
- Peek popovers (ADR 0017). Entity links in news, connections, changes and lists open a popover with the name, kind, portrait or initials, role, description, key facts, news count and source, and an "Open pagina" button to the full page. Phones get a bottom sheet. The data comes from 64 lazily loaded same-origin files built by `web/scripts/build-peek-index.mjs`.
- A share or copy-link button in the popover and on entity pages, and a news filter by mentioned entity (`?entity=`).
- 149 official Tweede Kamer portraits from the Tweede Kamer Open Data portal (CC0 1.0), 57 of them for members who had none; 72 people have a portrait for the first time. Remaining gaps are named in `research/qa/portraits-25-09-2026.md`, and profiles without a photo show an initials avatar in the party or branch colour.

### Changed (25-09-2026)

- News cards are one design everywhere: mentioned entities are a single line of inline links coloured by kind instead of pills, the source is one line instead of a pill plus a footnote list, and on phones the thumbnail sits beside the headline so the summary gets the full width.
- The change timeline groups changes by day under a sticky date, with a kind mark, a portrait or initials, a plain sentence with popover links, before and after values, and a quiet source link on a vertical rail. Rows fade in once, and not at all under reduced motion. Tenure timelines and the home change block use the same design.
- iPhone and iPad pass over every route: 44 px touch targets, 16 px form fields, scrolling tab and filter rows, safe-area insets, tables that fit on a phone, and a compact graph panel with a full-screen button on phones.
- The graph draws every connection as a solid line; relation types differ by colour, width and opacity, faint at rest and in accent for the selection.
- The news run is hourly from 06:15 to 23:15 Dutch time plus one night run (ADR 0016).

### Fixed (25-09-2026)

- Clicking another body inside an unpacked group on the graph no longer folds the group (`web/lib/cluster-click.ts`).
- NL Times items are ingested: their dates were not parsed before.

### Removed (25-09-2026)

- The 53 Eerste Kamer portraits: the Eerste Kamer colophon requires permission to republish its images, which contradicts the licence assumed in ADR 0014 (amendment 1).

### Known issues

- The entity linker misreads some foreign or ambiguous names, for example the American broadcaster CBS as the Dutch CBS, foreign police as `org:politie`, "de regering-Trump" as `org:regering`, and "RIS" as `org:rijksinkoopsamenwerking`. Recorded for a linker fix.

### Changed

- Clusters on the graph. Inside a sector, a body with three or more children draws them as a grid of dots (the ministries' agentschappen, inspecties and ZBOs, the Kamers' commissies), and in the gemeenten sector the parentless bodies too: the gemeenten by the provincie that oversees them (the dataset's `oversees` relation, labelled as oversight), the veiligheidsregio's and samenwerkingsverbanden by kind (34 grids in all). Clicking a grid, or picking one of its members, unpacks it in place: that sector is packed again with the shared ring packer (`web/lib/ring-pack.ts`) so the members get the arc they need and the neighbours slide aside; one grid is open at a time and the sector keeps room for its widest grid at build time. Layout id `nl-tiers-v2`, bundle field `clusters`.
- Marks are outlines in their branch colour with a see-through fill that deepens under the pointer, as a relation, on the path and as the selection. Hovering a mark or a grid shows a tooltip with the name, the subtype in the branch colour, the tier, the parent body and the number of relations.
- The two Kamers sit on their own ring instead of in a block. The Staten-Generaal sector's arc is the seating (Grondwet art. 51), with the Tweede Kamer and the Eerste Kamer as two separated stretches of it, each named, three rows deep and about a third the depth of the arch it replaces. Every fractie is a contiguous wedge of whole columns, so party groups stay together and the two chambers cannot be confused; hovering names a fractie, clicking picks it out. The unexplained dashed majority line is gone from the canvas and stays, with its legend, on the chamber pages. Layout id `nl-tiers-v5`.
- A details panel beside the graph replaces the floating card. It describes whatever is selected: an organization with its subtype, tier, parent, group, relations by verb and its path to the electorate, every row a link into the graph; a group of dots with the bodies it holds; a fractie with its seats, the same party in the other chamber and its party page; a chamber with its fracties and majority; a sector with its size.
- The view is fixed: selecting or unpacking no longer zooms or pans; the reader owns the zoom and the pan. Unpacking happens in place: the members take the grid's own ring and push only the neighbours that are in the way, and every change is one quick motion from wherever things are, so switching between grids is immediate. A click on a single dot selects that body straight away. The commissie grids pack outside the Kamers' seats, the canvas has no dead margin and the glyphs are larger (layout `nl-tiers-v4`).
- The two Kamers on the canvas are one target each: a block the size of the arch selects the chamber and tints on hover, the seats are decoration until the reader zooms past 2x, the arches sit further apart, and the tooltip gives the seat count and the majority. The chamber pages are unchanged. Layout id `nl-tiers-v3`.
- Hovering no longer re-renders the canvas: the tint and the tooltip are written outside React's render of the 1600 elements, which removes the lag as the pointer crosses marks.
- The turn to the selection can be switched off with the ↻ button under the zoom buttons; the choice is remembered in the browser.
- The graph keeps every body in its place. Selecting one no longer summons its relations onto a halo or pushes the outer rings back; the canvas still turns to bring it to the top, now on a slower spring, and the selection, its path to the electorate and its direct relations light up where they are, collapsed children appear beside their body, and the view zooms to hold them and the core. Names are now drawn upright at one size on screen (12 px) for the selection, its relations and the mark under the pointer, placed each frame so they never overlap each other or a mark (`web/lib/label-placement.ts`, ADR 0015 amendment 2).

### Added

- The graph rebuild plan (`docs/13-graph-rebuild-plan.md`) and ADR 0015: the canvas moves from a single ring system to constitutional poles around the electorate, gains a motion model (turn, gather, step back), a build-time layout, dated relations, election and coalition data, and a Tweede Kamer hemicycle. Geometry variants are compared on rendered SVGs before the layout is chosen; pending owner decisions are listed in the plan. Phase 0 shipped the schema (dated relations, elections, coalitions) and phase 1 the variant renders in `research/graph-variants/` (polder and tier layouts, computed overlap and edge criteria). The owner chose the concentric tier layout on 19-09-2026 (ADR 0015 amendment); the B2 renders build it with a curated ring table, ring-gap edge routing, collapsed local triads and the ∩ arch seat chart.
- A rebuilt budget overview at `/begroting/`. Each ministry tile gains a factual one-line description taken from the sourced organization record, last year's budgeted spending in small type beneath the current figure, the colour-coded percentage change against that year, the ministry's share of the total budgeted spending, and `^1`-style footnote markers that link to a numbered source list at the bottom of the page (`web/components/budget/footnote-marker.tsx`, `web/components/budget/source-footnotes.tsx`, `web/lib/budget.ts`).
- Weekly link-check workflow, a dataset contract check in CI and every deploy workflow, and the public correction path on the method page.

### Added

- Election results and kabinetten as data. `data/elections.json` holds the zetelverdeling of every Tweede Kamer election since 1946 (25) and every Eerste Kamer election since 1983 (12), from the Kiesraad and CBS StatLine, with parlement.com at medium confidence where no official table exists (workstream Q). `data/coalitions.json` holds every kabinet since Schermerhorn-Drees, rompkabinetten included, from Rijksoverheid and parlement.com (workstream R); per that source the sitting kabinet is Kabinet-Jetten since 23-02-2026. Twenty-eight dissolved or unlisted parties they refer to are registered in `web/lib/parties.ts` without colours and without pages.
- The mandate and accountability edges of the constitution: `elects` from the electorate to every provinciale staten, gemeenteraad, algemeen bestuur of a waterschap and eilandsraad, `elects` from the provinciale staten to the Eerste Kamer, and `accountable_to` from the regering and the ministerraad to the Kamers, each with the article quoted in its source (workstream U, 393 relations). The canvas now draws the four direct mandates inward from the electorate frame.
- Fifty-eight ministry relations dated from the Staatscourant besluiten of the 2010, 2017, 2024 and 2026 departmental reorganisations (workstream T), the first `validFrom` values in the dataset.
- Workstream S established that neither chamber publishes a seat number per member; recorded as a named gap, so the seat charts keep the fractie-block order and say so.

- Seat history. The Tweede Kamer and Eerste Kamer pages list every election in the dataset as a stacked seat bar, newest first, with the majority marked, turnout where the source has it, and the Kiesraad, CBS or PDC source linked per result (`web/components/parliament/election-history.tsx`). Party pages show a sparkline of the party's seats per chamber across elections with the numbers in a table beneath it (`web/components/parliament/seat-sparkline.tsx`).
- An "as of" date on the canvas draws the dated relations as they stood on that date (`edgeAlive` in `web/lib/graph.ts`); undated relations are the current state and stay.

### Changed

- The graph layout is computed once at build time and shipped in `graph.json` (schema `nl-graph-bundle-v2`); the client hydrates it and no longer ships the packer, so the web app and the later Swift app draw the same picture from the same file. The machtskaart moved to its own `power-map.json`, loaded only when it is shown. Every organization-to-organization relation type is emitted with its `validFrom` and `validTo` where the data has them.
- The graph canvas is rebuilt on the concentric tier layout `nl-tiers-v1` (ADR 0015, spec in `web/lib/graph-layout.md`). Six tiers by statutory function radiate from the Grondwet at the core, the electorate is the outer frame, and sectors inside each tier spread their marks evenly over the whole arc instead of packing them against one edge. A gemeente, provincie, waterschap or openbaar lichaam is now one mark carrying its raad and commissie as orbit marks, which takes the canvas from 1640 marks to 882. The Tweede Kamer and Eerste Kamer are drawn as ∩ arches with straight legs, 150 and 75 seats exactly, in the sourced party colours with the majority marked. Cross-sector edges are routed along the ring gaps, so none crosses the core.
- The Tweede Kamer and Eerste Kamer pages draw their seats as a ∩ arch (`web/components/parliament/arch-chart.tsx`): the same geometry as the canvas, with fractie labels, the majority line and every block linking to its party page; party pages show the same arch compact with the party's seats at full strength. The bar tally stays beneath it as the legend.
- The canvas gained a motion layer (`web/lib/pose.ts`, `web/lib/motion.ts`, `web/components/graph/graph-canvas.tsx`, replacing `graph-explorer.tsx`). Selecting a body turns the canvas until it sits straight above the core, gathers its children and relations onto a halo, and steps the outer tiers back to make room; ghosts and tethers show where a summoned mark came from. Everything animates with one critically damped spring per value, snaps under `prefers-reduced-motion`, and is written to the DOM by one animation frame instead of re-rendering the tree. Dragging outside the outermost ring turns the canvas like a dial.

### Fixed

- The home column and news page no longer cut text mid-sentence: summaries are clamped at a sentence boundary in code (`clampSentences`, `clampMarkupSentences` in `web/lib/news-text.ts`) instead of a CSS line clamp, so a card ends on a full stop or, when a sentence has to break, at a word with an ellipsis. Source rows keep their number in a fixed column so a long title wraps under itself; the timeline's first and last labels and count bubbles anchor to the card edge instead of spilling past it; the "zetels" label on a vacancy card no longer runs into its value; change cards show dates in the project format.
- Organization, person and position pages no longer squeeze their news and connections into a 12rem strip beside the facts rail: the facts block sits first at full width and the tabs follow, because the content column is 32rem wide and never had room for two columns.
- Marks at rest on the canvas are merged into one path per sector and glyph with a transparent hit circle each (16 paths and 883 circles instead of 1640 groups of two or three elements); a mark gets its own element only while selected, highlighted or moved by a pose. Edges that only ride the step back are refreshed every sixth frame. Frame times measured in headless Chrome are recorded in `web/lib/graph-layout.md` section 12.
- Halo labels on the canvas run along the radius, reading outward and flipped upright on the left half, so twenty summoned bodies no longer stack their names on top of each other.
- On phones the page no longer scrolls sideways: the canvas header controls wrap, the grid columns may shrink below their content, the scope pill and the history arrows hide below the small breakpoint, and the hover callouts of the people strip open toward the middle so a hidden callout never widens the page.

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
- News cards restyled: emphasized titles, date under the title, clamped summary, outlet source pill with an external arrow, image tile on the right, and a small language tag for EN-language items. Topic pages show branch-coloured responsible-org chips; budget pages use stat-tile styling with a green-up red-down change indicator.
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

- The project, package, and storage names are Staatsgraaf everywhere: `package.json` names `staatsgraaf` and `staatsgraaf-web`, the theme key `staatsgraaf-theme`, the canvas event `staatsgraaf:focus`, and the license credit lines. Readers who chose a theme before this change see the default theme once and choose again.
- Dates in documents are written as dd-MM-YYYY (`CONTRIBUTING.md` section 6). The markdown under `docs/` and `research/` was converted with `scripts/format-dates.py`, and CI now fails a pull request that leaves an ISO date in checked prose. Data files, ids, URLs, and quoted data values keep ISO 8601. Generated `ATTRIBUTION.md` and the frozen snapshots under `research/raw/` are excluded on purpose: they quote data values.
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
