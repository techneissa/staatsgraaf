# Reference system spec: CivLab Gov Graph

This document records what we studied in the reference product, how it behaves, and how it is built. It describes behaviour and structure in our own words. It does not quote the reference's copy, and Staatsgraaf does not copy its markup, styling, text, images or data (`docs/adr/0026-reference-product-and-credit.md`). Read it with `01-vision-and-goals.md` (why) and `04-data-model.md` (the schema we use).

The reference is three live sites maintained by CivLab:

- https://graph.civlab.org/us, the United States federal graph.
- https://sfgov.civlab.org/sf, the San Francisco city graph. This is the newest version (v3) and the richest in features.
- https://v2.sfgov.civlab.org, an earlier graph-first version.

Everything below was observed on 17-09-2026 by viewing the sites and using the live UI. Counts are as the sites showed them that day, and they have since moved.

## 1. What the product is

A public, source-backed data model of a government, rendered as an explorable graph plus a set of editorial pages. The site says its aim is to make a government understandable: it models every body, every position and every person in it, and the legal ties that join them.

The site has four data layers:

1. **Entities**: organizations and offices (departments, commissions, advisory bodies, elected offices).
2. **Positions**: seats and jobs inside entities, modeled as their own nodes.
3. **People**: current officeholders, each with a start date, a party where relevant, and a portrait.
4. **Relationships**: typed, directed edges between the above (appoints, oversees, advises, elects, office, dept_head, confirms, ex_officio, administers).

On top of that sit four living layers:

5. **Changes**: a dated stream of appointments, departures, and structural changes detected by monitoring official sources.
6. **News**: recent articles, each summarized and with the entities it mentions linked inline.
7. **Topics**: cross-cutting issue areas (housing, transit, public safety) that map to responsible entities.
8. **Budget**: per-organization spending and revenue, with ten-year history and current-year breakdown.

The design intent is editorial, not dashboard. The side of every page that holds text is a readable column of news, changes, and summaries. The other side is the graph, always present, always reflecting the entity you are currently looking at.

## 2. Visual language and layout

### Global chrome

- A small brand lockup at the top left with a switch between governments.
- At the top right, a theme toggle and back and forward buttons.
- The app opens in dark mode. The canvas is near-black, panels are slightly lifted, text is off-white, and one accent colour marks live or selected items.
- A segmented toggle at the bottom of the canvas swaps the graph and the power map. The graph is the default.
- A legend control on the canvas, a dropdown.
- A search control that expands into an input.
- One sans family throughout. Headings are large and sentence case. Small labels are uppercase and letter-spaced.
- Cards have rounded corners, a hairline border and generous padding, on flat surfaces.

### The two-column spine

Every page uses the same split:

- One column of scrollable editorial content, about two fifths of the width on a wide screen. It scrolls independently.
- One full-height canvas holding the graph or power map. It never scrolls and persists across navigation.

On the homepage the editorial column holds the latest news, the people in the news, the latest changes, an overview and an about block. On an entity page it holds the entity header and its tabs, and the canvas stays, highlighting that entity.

This persistence is the signature interaction. Moving from the homepage to an entity does not tear down the graph. The graph re-centers and redraws the connection path for the new entity.

### The graph canvas

- Radial sector layout. A center hub stands for the constituency, the electorate. Around it, wedge sectors are separated by thin spokes and labeled on the outer rim for the branches and for groupings such as the legislature and the cabinet.
- Each sector holds nodes drawn as small vector glyphs. Entity types get different glyphs. Nodes sit on concentric rings within their sector. Dense groups read as a ring of repeated marks.
- Edges are thin curved lines, dim by default. The selected path is drawn in the accent colour and is clearly brighter.
- On an entity page the current entity is highlighted at its position, the hub is highlighted, and the connecting edges light up. A floating label with the entity name sits near the bottom of the canvas.
- The canvas supports pan and zoom. Clicking a node focuses it and reveals its label and neighbors.

### The power map

- The same canvas, a different view. A centered heading names the view, with a subtitle that gives the number of people, articles and sources and the window of days.
- People are drawn as circular portraits laid out as a network with faint connecting lines. The most mentioned person is the largest and most central.
- Under each portrait: name, party and role, an article count and how recently the person was in the news.
- The people are the top twenty by mention count over a rolling 90-day window.

### Search

- Opening search expands an input across the top of the canvas. A dim scrim covers the page.
- Results render in a dropdown panel below the input, under an entities heading.
- Matching is fuzzy and alias-aware: an abbreviation of a body finds that body first, then bodies whose names loosely match. Each result links to its entity page.
- The empty state differs by graph. One invites a search by common agency name; the other says nothing was found and suggests simplifying the query or exploring popular topics.
- The reference ships two search inputs in the page, one for desktop and one for mobile. Staatsgraaf uses one.

### UI vocabulary

We do not reuse the reference's labels. Our Dutch and English UI strings are in `web/lib/i18n` and are written for this product.

## 3. Pages

### 3.1 Homepage `/[gov]` (for example `/us`)

The editorial column, top to bottom.

**Latest news.** A handful of items. Each is a short paragraph written by an LLM summarizer from one or more articles. Entity names inside the paragraph are inline links to entity pages. Each sentence or clause carries a numbered superscript citation that links to the source article. Toggles expand the set.

**People in the news.** A horizontal strip of small circular portraits taken from the overview's focused people, with a right-aligned callout that switches the canvas to the power map. The San Francisco version replaces this with larger cards, each with a description and a profile link.

**Latest changes.** A header row with segmented tabs for 7, 30 and 90 days (30 is the default), a one-line description of how changes are monitored, and three stat tiles: vacant seats, acting officials, and the age of the last change. Below the tiles, a timeline block with the count of changes in the window and a small histogram of daily bars with an axis from thirty days ago to today. Then a reverse-chronological feed grouped by day. Each item is a card with:

- a coloured kind badge (an appointment or a departure),
- a date with an outbound arrow that is the source link,
- the position name,
- an out row and an in row. The out row shows a predecessor, or a note that none is on record. The in row shows the new person, or a note that the seat is now vacant.

A button at the bottom shows all changes in the window.

**Overview.** A short intro line and two count lists, one by type of body and one by branch. A footer gives the total number of organizations and how many are sub-agencies. The San Francisco homepage shows fiscal tiles instead: population, numbers of bodies by type, total budget and revenue, city employees, each with a year-over-year arrow, plus a link to explore the budget.

**About.** The mission paragraph and contact links.

Beside the editorial column: the graph.

### 3.2 Entity pages

Routes: `/[gov]/departments/[slug]`, `/[gov]/commissions/[slug]`, `/[gov]/advisories/[slug]`, `/[gov]/elected/[slug]`, `/[gov]/dept-heads/[slug]`.

Layout, as seen on one department page:

- A breadcrumb that names the government and the branch.
- A large title and a description of two to four sentences. For US departments the enabling statute is written into the prose.
- Two pill links side by side: the legal source and the official website.
- A current officeholder block: a label with the position title, then a portrait card with the name and the year of appointment. When a body has many members (a chamber, a large board), this becomes a seat count and a grid of portrait cards with a link to see them all.
- A row of related-entity chips for the parent bodies.
- Two tabs (Radix tablist): news, and who is connected. The news tab has a media section of article cards with headline, date, source domain and a load-more button. The connections tab lists adjacent entities and people as links, driven by `connectedNodes`.
- The canvas stays mounted and highlights this entity, drawing its edges to the hub in the accent colour, with the entity name labeled at the bottom.

San Francisco entity pages additionally show the topics a body is connected to.

### 3.3 Topic pages

`/[gov]/topics` (a grid of cards with a name, a description and a link) and `/[gov]/topics/[slug]`. A topic page has a breadcrumb, the topic title and description, a news feed of dated cards with image, headline, summary and source, a list of responsible entities, and a media section. San Francisco has five topics. The US graph ships none.

### 3.4 Request page

`/request` exists with empty props and a client-side form to request a government graph for another place. Not core to our product, but noted as a known surface.

### 3.5 Routes that do not exist

There is no `/people/` or `/person/` route. Person data is embedded inside entity nodes. The build manifest lists only the home, entity, topic, request and error routes. There is no sitemap and no source-detail route. A source link in a change item returns 404, so source ids resolve through an internal registry, not a public route. We should do better and expose a source page.


## 4. Data model observed in the sites

Every page embeds a full `__NEXT_DATA__` JSON payload. The relevant `pageProps` keys are `gov`, `data`, `overview`, `news`, `changes`, and `breadcrumb`. Because the whole graph ships on every page, one fetch yields the entire dataset (about 2MB for the US graph, under 1MB for the San Francisco graph). The field lists below are the observed shape of the data, kept as structure only. `research/N-reference-model.md` has the detail.

### 4.1 `data` (the graph)

Top-level keys: `nodes` (a dict keyed by slug), `edges` (a dict keyed by an 8-hex-char id), `constituency` (one node id string), `elected`, `commissions`, `advisories`, `departments`, `deptHeads` (lists of node ids), `topics` (dict), `budget` (dict). The US graph adds `satellites` (a list of node ids for small bodies placed outside the main layout), `layout` (a string that selects the sector layout), and `powerMap`.

The US graph has several hundred nodes, most of them `dept_head` and `department`. The San Francisco graph has a few hundred nodes and about eight hundred edges.

### 4.2 Node shape

```
type, id, name, description,
people: { type: "people", people: [ ... ] },
edges: [edgeId, ...],
connectedNodes: [nodeId, ...],
employeeCount: { budget, actual } | null,
departmentCode: string | null,
headOf: nodeId | null,      // on dept_head nodes, points at the body
head: nodeId | null,        // on body nodes, points at the head position node
topicsWithRelevance: [ ... ],
legalSourceUrl: string | null,
officialUrl: string | null,
aliases: [string, ...],
seatsCount: integer,
featuredPersonImageUrl: string | null
```

Node `type` values: `elected`, `commission`, `advisory`, `department`, `dept_head`, `constituency`.

Notes that matter for modeling:

- `department` is a catch-all for any body: departments, agencies, courts, corporations. Sub-agencies are just child `department` nodes.
- `dept_head` is a position modeled as its own node, with `headOf` pointing at the body. The body carries `head` pointing back.
- `constituency` is the electorate. It has `elects` edges to elected offices.

### 4.3 Person entry

Inside `node.people.people[]`:

```
id, name, positionId, positionName,
type: "elected" | "appointed" | "acting",
startedAt: ISO date,
imageUrl: string | null,
party: string | null
```

A person carries a start date but no end date in the current snapshot, so the site infers "current" from presence. A person can appear under more than one node. There is no person page, so this entry is the whole person record on the reference site.

### 4.4 Edge shape

```
id (8 hex chars), type, fromId, toId, metadata, seatsAppointed
```

`metadata` carries slot details such as `{ seat_number: 9, advisory_entity: "..." }` or `{ commission: "...", seat_number: 4 }`.

Edge `type` values across both graphs: `appoints`, `advises`, `dept_head`, `oversees`, `elects`, `office`, `confirms` (US only), `ex_officio` (US only), `administers` (US only).

In both graphs `appoints` is the most common type, followed by `dept_head`, and the rest are small.

Directions to preserve: `fromId` appoints or oversees `toId`; the constituency `elects` an office; a body `dept_head` a position; a position is `office` of a body.

### 4.5 `changes`

```
generatedAt,
stats: { vacantSeats, actingOfficials, lastChangeDate },
items: [ {
  kind: "personnel",
  id: "tenure-start-1466" | "tenure-end-1137",
  date, personName, positionId, positionName,
  groupId: org that owns the position,
  entryMode: "appointed" | "acting" | "elected",
  departure: boolean,
  predecessorName: string | null,
  sourceUrl: "20260916_uscirf_399" | "20260916_acting_sweep_396"
} ]
```

The homepage says it tracks three change kinds: appointment, departure, and structural change. Nearly all observed items are `kind: "personnel"`; a few are `kind: "entity"` (`research/N-reference-model.md` section 6).

### 4.6 `overview`

```
latestSummaries: [ { id, summary, url } ],
trendingTopicIds: [ ... ],
focusedPeopleIds: [ nodeId, ... ],
overviewStats: { ... },
budgetYoyChange, currentRevenue, employeesYoyChange, revenueYoyChange
```

SF `overviewStats` fields: `total_advisories`, `total_commissions`, `total_departments`, `total_elected`, `total_actual_employees`, `total_budgeted_employees`, `total_spending_actual`, `total_spending_budget`, `budget_diff_vs_last_year`, `total_residents`, `voter_turnout_percentage`, `current_fiscal_year`, and a `metadata` object giving `data_year` and `source_url` per figure.

The US homepage computes By Type and By Branch counts client-side and ships a null overview.

### 4.7 `news`

An array of `{ id, summary, url, publication }`. The `summary` string embeds entity links with a custom inline tag that names the entity id around the mention. The homepage renders those as inline links and appends numbered superscript citations that link to `url`. SF uses the same tag. Our own inline links are described in `docs/adr/0017-inline-links-and-peek-popovers.md`.

### 4.8 `budget` (SF is the reference for this)

```
groups: [ { code, name, departments: [deptCode, ...] } ],
departments: {
  CODE: {
    code, name, nodeId,
    currentBudget: { fiscalYear, totalSpending, totalRevenue, net, nonprofitSpending },
    currentActual: { ... },
    previousBudget: { ... },
    previousActual: { ... },
    budgets: [ { fiscalYear, totalSpending, totalRevenue, net, nonprofitSpending }, ... ten years ],
    actuals: [ ... ten years ],
    currentBudgetBreakdown: {
      fiscalYear,
      breakdown: [ { category, amount, type: "spending" }, ... ],
      totalBudget
    },
    contractStats: {
      activeContracts, totalContractValue, totalSuppliers,
      nonprofitContracts, nonprofitSuppliers, nonprofitSpending, medianDurationYears
    },
    citywideRevenueRanking, citywideSpendingRanking,
    citywideContractsRanking, citywideNonprofitSpendingRanking,
    nonprofitFiscalYear, nonprofitSpendingAmount
  }
},
totalSpendingBudget
```

The breakdown categories are the usual city budget classes: salaries and benefits, services, supplies, programmatic projects, debt service, grants, capital outlay, transfers and facilities. Budget groups are functional, such as general administration, culture, health and welfare. Our budget model is in `docs/04-data-model.md` section 12.

### 4.9 `topics`

```
{ <topicId>: { id, name, description, nodes: [nodeId, ...] } }
```

### 4.10 `powerMap` (US)

```
windowDays: 90, since, computedAt, articleCount,
sources: [ publication names ],
people: [ {
  id, name, job, positionId, party, nodeId, bodyNodeId, imageUrl,
  rank, total, recent,
  weeks: [ 12 integers, weekly mention counts ],
  heat: number,
  latest: { at, date, headline, source, url }
} ]
```

This is a media-attention model over a rolling window. Each person gets a twelve-week sparkline and a heat score. The power map view in the canvas is a rendering of this array.

### 4.11 `satellites` and `layout` (US)

`satellites` lists small bodies placed outside the main radial layout (boards, offices and sub-agency units). `layout` selects the sector layout algorithm.

## 5. How the reference is built

Observed stack facts, useful because they tell us what not to over-build and where the real work is. Our own stack is in `docs/06-build-plan.md` section 3.

- Next.js with the **Pages Router**, not App Router. Data is server-rendered into `__NEXT_DATA__`.
- Tailwind CSS with a custom token layer and dark variants.
- Radix UI primitives for the dropdowns and the tabs.
- The graph and power map render as **inline SVG**, not canvas. The layout is a custom, deterministic sector layout rather than a force simulation, and no graph-layout library is present (`research/N-reference-model.md` section 10).
- Optimized images via the framework image route. External images come from Wikimedia Commons, government sites and news CDNs.
- Console noise on the live site includes repeated errors for SVG dimensions set to `auto`, a small bug we avoid by setting explicit SVG dimensions (`research/M-design.md` section 9).

## 6. Interactivity inventory (what we studied and what we build)

Each item is an observed behaviour of the reference. Staatsgraaf builds its own version of each one; where ours differs, the item says so.

1. A persistent canvas that stays mounted across navigation and re-highlights the current entity.
2. Graph pan and zoom on a large radial map. Ours is the concentric tier layout of ADR 0015, not the reference's single ring system; dragging outside the outermost tier turns the canvas like a dial.
3. Click a node to focus it, reveal its label and neighbors, and draw its path to the hub. Ours turns the canvas until the focus sits straight above the core and keeps every body in its place: the selection, its relations and its path light up where they are, their names are placed without overlap at one size on screen, and the view zooms to hold them and the core. The children of one body in a sector are a grid of dots that unpacks in place (the reference also unpacks a group in place), with the neighbours on the ring sliding aside and one grid open at a time. The two Kamers are seated on their own ring, a wedge of seats per fractie. A details panel beside the canvas describes whatever is selected, body, group, fractie or sector (`web/lib/graph-layout.md` sections 5, 8 and 9). Clicking a sector selects the whole group and frames it.
4. A toggle that swaps the canvas view (graph and power map) without a page load. Ours swaps the graph and the connections view.
5. A legend dropdown that filters or annotates node types. Ours also filters by branch.
6. A global search overlay: it expands from the top bar, dims the page, fuzzy-matches names and aliases, groups results, and links each result.
7. A switch between governments, plus back and forward buttons. Ours has a scope label and history buttons.
8. A light and dark theme toggle.
9. News summaries with inline entity links and numbered source citations, with ways to expand the set.
10. A strip of people in the news that feeds the power map through a callout button.
11. Window tabs (7, 30 and 90 days) that refilter the change feed and the histogram.
12. A timeline histogram with per-day bars, counts and an axis.
13. A change feed grouped by day with kind badges, source links, and out and in rows.
14. A control that shows every change in the window.
15. Overview count lists by type and by branch.
16. Entity page tabs for news and for connections.
17. A news card list with a load-more control.
18. A topic grid and topic detail with a list of responsible entities.
19. Fiscal tiles with year-over-year indicators and an entry to explore the budget.
20. Every fact carries a source link and, where the reference lacks it, an updated-at stamp (we improve here).
21. The Tweede Kamer and Eerste Kamer drawn as ∩ arches, on the canvas and on their pages, with the majority marked (ours; the reference has no seat chart).

## 7. Gaps in the reference we will close

The reference has real weaknesses. Our product should fix them, and the difference is part of the pitch.

- **No person pages.** People live only inside nodes. We give every person a stable slug and a page with a full tenure history.
- **No end dates.** Tenures carry only `startedAt`. We store `start` and `end` so history and predecessor chains are explicit.
- **Broken source links.** Change items link to an id that 404s. We expose a real source record and a working link.
- **No legal source on most nodes.** Only some nodes carry `legalSourceUrl`. We require a legal basis for every organization and position where one exists.
- **Thin provenance.** The reference exposes one URL per fact at most. We store a source array with retrieval dates and confidence.
- **No topics in the US graph.** We ship topics from day one.
- **No access to the raw data.** We publish the normalized JSON as an open dataset with a license.

## 8. What is out of scope

- Visual replication. We learn from the information architecture and the interaction model. Our look, markup, styling, icons and wording are our own.
- The `/request` lead form, unless wanted later.
- Reusing CivLab's prose, images, data or code. We write original descriptions and use government and Commons sources.
- Any claim of affiliation with the Dutch government. We ship a disclaimer.

## 9. Open questions from the recon (answered in `research/N-reference-model.md`)

- Does the reference use a layout library in a chunk we did not inspect? Not important for us, because we will choose our own, but note it.
- How does the reference resolve a `sourceUrl` id to a human-visible source? It appears to be a data registry with no public route.
- What is the SF `data.constituency` id and the exact `topicsWithRelevance` item shape? Fetch one SF topic page and one SF entity page to confirm.
- What fields does the `/request` form collect? Fetch and record.

The answers are in `research/N-reference-model.md` sections 10 to 12 and 14.

## 10. Route map for the Dutch product

The reference routes are above. These are our routes. They follow the same information architecture and add the pages the reference lacks (person and position pages). Slugs follow `04-data-model.md` section 16.

| Route | Page | Reference equivalent |
| --- | --- | --- |
| `/` | Homepage, the "NL Rijk" scope | `/[gov]` |
| `/organisaties/[slug]` | Organization page | `/[gov]/departments/[slug]` and siblings |
| `/personen/[slug]` | Person page with the full tenure history | none (a gap we close) |
| `/posities/[slug]` | Position page with holder history | none (a gap we close) |
| `/onderwerpen` | Topic grid | `/[gov]/topics` |
| `/onderwerpen/[slug]` | Topic detail | `/[gov]/topics/[slug]` |
| `/wijzigingen` | Full change feed with filters | folded into the homepage on the reference |
| `/begroting` | Budget overview | the SF "Explore budget" entry |
| `/begroting/[slug]` | Per-organization budget | the reference's per-department budget data |
| `/methodiek` | Method, sources, AI disclosure, and the disclaimer | the reference's About card |
| `/privacy` | Privacy statement | none |
| `/toegankelijkheid` | Accessibility statement | none |
| `/data` | Dataset download, license, and citation | none (an improvement) |
| `/api/v1/...` | Read-only JSON per scope and type | the reference's embedded `__NEXT_DATA__` exposed properly |

Routing rules:

- A scope switch (`NL Rijk`, later `NL Decentraal`, `Caribisch Nederland`, the Kingdom countries) changes the base path or a path prefix, the way the reference switches `gov`.
- The canvas is a shared layout element across routes, so it persists across navigation. On mobile it collapses to a control, per `12-discovery-privacy-accessibility-security.md` Part 5.
- Every route has a static fallback so it renders without JavaScript, per the indexability rules in `12-discovery-privacy-accessibility-security.md` Part 1.
- `/api/v1/...` serves the versioned JSON described in `06-build-plan.md` section 9.4, so the web app, the Swift app, and outside consumers read one contract.

