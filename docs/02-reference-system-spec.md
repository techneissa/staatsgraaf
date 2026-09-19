# Reference system spec: CivLab Gov Graph

This document records what the reference product is, how it behaves, and how it is built. It is the source of truth for "what we are cloning". Read it with `01-vision-and-goals.md` (why) and `04-data-model.md` (the schema we will use).

The reference is three live sites maintained by CivLab:

- https://graph.civlab.org/us, the United States federal graph.
- https://sfgov.civlab.org/sf, the San Francisco city graph. This is the newest version (v3) and the richest in features.
- https://v2.sfgov.civlab.org, an earlier graph-first version.

Everything below was observed directly on 17-09-2026 by fetching the sites and driving the live UI. Where a value is a count or a label, it is quoted from what the site rendered that day.

## 1. What the product is

A public, source-backed data model of a government, rendered as an explorable graph plus a set of editorial pages. The core claim on the site is: "We cannot govern systems we don't understand, so we built a complete data model of the United States federal government: entities, positions, people, and the legal relationships between them."

The site has four data layers:

1. **Entities**: organizations and offices (departments, commissions, advisory bodies, elected offices).
2. **Positions**: seats and jobs inside entities, modeled as their own nodes.
3. **People**: current officeholders, each with a start date, a party where relevant, and a portrait.
4. **Relationships**: typed, directed edges between the above (appoints, oversees, advises, elects, office, dept_head, confirms, ex_officio, administers).

On top of that sit three living layers:

5. **Changes**: a dated stream of appointments, departures, and structural changes detected by monitoring official sources.
6. **News**: recent articles, each summarized and with the entities it mentions linked inline.
7. **Topics**: cross-cutting issue areas (housing, transit, public safety) that map to responsible entities.
8. **Budget**: per-organization spending and revenue, with ten-year history and current-year breakdown.

The design intent is editorial, not dashboard. The left of every page is a readable column of news, changes, and summaries. The right is the graph, always present, always reflecting the entity you are currently looking at.

## 2. Visual language and layout

### Global chrome

- Top left: a small brand lockup, "CivLab / US Gov" with a dropdown chevron. The wordmark uses a small starburst glyph.
- Top right: a theme toggle (dark and light), and back and forward page chevrons.
- The app opens in dark mode by default. The canvas is near-black, panels are slightly lifted dark grey, text is off-white, one accent color marks live or selected items (orange in the US graph).
- Bottom right of the canvas: a segmented toggle, `Graph` and `Power map`. Graph is selected by default.
- Bottom left of the canvas: a `Legend` control, rendered as a dropdown button.
- Top left of the canvas: a search icon that expands into an input.
- Type is a single sans family throughout. Headings are large and sentence case. Small labels are uppercase and letter-spaced (SEATS VACANT, TIMELINE, LEGISLATIVE).
- Cards use 10px rounded corners, a hairline border, and generous padding. Cheap shadows, flat surfaces.

### The two-column spine

Every page uses the same split:

- Left: a fixed-width scrollable column (about 512px at 1280 wide) holding the editorial content. It scrolls independently.
- Right: a full-height canvas holding the graph or power map. It never scrolls and persists across navigation.

On the homepage the left column holds, in order: Latest News, Who's in the news, Latest Changes, Overview, About. On an entity page the left column holds the entity header and its tabs, and the canvas stays, highlighting that entity.

This persistence is the signature interaction. Moving from the homepage to an entity does not tear down the graph. The graph re-centers and redraws the connection path for the new entity.

### The graph canvas

- Radial sector layout. A center hub labeled with the constituency ("People of the United States"). Around it, wedge sectors separated by thin spokes and labeled in uppercase on the outer rim: LEGISLATIVE, JUDICIAL, CONGRESS, CABINET, EXECUTIVE, HIGHEST AUTHORITY, OVERSIGHT, ADMINISTRATION.
- Each sector holds nodes drawn as small vector glyphs. Different entity types get different glyphs (shield, hexagon, capsule, generic mark). Nodes sit on concentric rings within their sector. Dense groups (sub-agencies, courts) read as a ring of repeated marks.
- Edges are drawn as thin curved lines. The default state is dim. The selected path is drawn in the accent color and is clearly brighter.
- On an entity page, the current entity is highlighted at its position, the hub is highlighted, and the connecting edges light up. A floating label with the entity name sits near the bottom center of the canvas ("Department of Justice").
- The whole canvas supports pan and zoom. Clicking a node focuses it and reveals its label and neighbors.

### The power map

- The same canvas, a different view. Header text centered at the top: "POWER MAP: WHO IS IN THE NEWS", with a subtitle such as "The 20 people named most across 964 articles from 3 sources in the last 90 days".
- People are drawn as 44px circular portraits (`data-testid="power-map-face"`) laid out as a network with faint connecting lines, largest and most central for the most-mentioned person.
- Under each portrait: name, party and role or position, article count ("219 articles"), and recency ("In the news 6h ago").
- The people are the top 20 by mention count over a rolling 90-day window.

### Search

- Opening search expands an input across the top of the canvas ("Search" placeholder, 662px wide at 1280). A dim scrim covers the page.
- Results render in a dropdown panel (`#search-results`) below the input, headed `Entities`.
- Matching is fuzzy and alias-aware. Typing "FBI" returns Federal Bureau of Investigation first, then bodies that fuzzy-match the letters (Financial Crimes Enforcement Network, Office of Terrorism and Financial Intelligence, Financial Research Office, Federal Deposit Insurance Corporation, Bureau of Indian Affairs, Bureau of Indian Education, Bureau of Industry and Security). Each result is a link to its entity page.
- Empty state text differs by graph. The US version invites search by common agency name (FBI, IRS, NASA). The SF version says "No results found" and suggests simplifying or exploring popular topics.
- There are two search inputs in the DOM, a desktop and a mobile one, both with class `search-input`. Use one locator.

### Small UI vocabulary (quote these when implementing)

`Latest News`, `Who's in the news`, `People in Focus`, `Trending Topics`, `Latest Changes`, `SEATS VACANT`, `ACTING OFFICIALS`, `LAST CHANGE`, `TIMELINE`, `APPOINTED`, `DEPARTURE`, `OUT`, `IN`, `Show all N changes`, `Overview`, `By Type`, `By Branch`, `About`, `Who's connected?`, `Who's Responsible?`, `Media`, `Part of`, `Legal Source`, `Official Website`, `See all (N)`, `Load more`, `Show more`, `Read more`, `Graph`, `Power map`, `Legend`, `Switch government graph`.

## 3. Pages

### 3.1 Homepage `/[gov]` (for example `/us`)

Left column, top to bottom.

**Latest News.** Four to six items. Each is a short paragraph written by an LLM summarizer from one or more articles. Entity names inside the paragraph are inline links to entity pages. Each sentence or clause carries a numbered superscript citation ("[1]") that links to the source article. A "Read more" toggle and a "Show more" button expand the set.

Example rendered text: "The Justice Department charged five suspected Russian intelligence operatives with plotting attacks, including a murder-for-hire of a dissident in the U.S.[1] The House passed a Russia sanctions bill 262-159, sending it to President Trump's desk to pressure Russia over its war in Ukraine.[2]"

**Who's in the news.** A horizontal strip of small circular portraits taken from `overview.focusedPeopleIds`, with a right-aligned callout `Power map >` (element `data-testid="power-map-callout"`) that switches the canvas to the power map. The SF version replaces this with "People in Focus", larger cards with a description and a "View profile" link.

**Latest Changes.** Header row with segmented tabs `7D`, `30D`, `90D` (30D default). Body copy: "Our agents monitor official sources to track every appointment, departure, and structural change in the graph." Three stat tiles stacked or in a row:
- `SEATS VACANT` with a count and the sublabel "no current officeholder".
- `ACTING OFFICIALS` with a count and the sublabel "serving unconfirmed".
- `LAST CHANGE` with an age ("1d") and the sublabel "ago, on Sep 16".

Below the tiles, a `TIMELINE` block with a count ("20 changes in window") and a small histogram of daily bars with labels, axis from "30d ago" through "20d", "10d", to "today". Then a reverse-chronological feed grouped by day heading ("YESTERDAY 4"). Each item is a card with:
- a colored kind badge (`APPOINTED` or `DEPARTURE`),
- a date with an outbound arrow that is the source link ("Sep 16 ↗"),
- the position name ("Member of the United States Commission on International Religious Freedom (Seat 2)"),
- an OUT row and an IN row. OUT shows a predecessor or the text "Predecessor not on record". IN shows the new person or the text "Seat now vacant".

A "Show all 20 changes" button sits at the bottom.

**Overview.** Intro line "Top level counts for the United States federal government." Then two count lists.
- By Type: Elected offices 4, Members of Congress 535, Departments & agencies 329, Military services 6, Commissions 46, Advisory bodies 14, Courts 19, Government corporations 18, Quasi-official bodies 45.
- By Branch: Legislative 19, Executive 343, Judicial 17, Independent 103.
- Footer: "482 organizations in total, 339 of them sub-agencies."

The SF homepage instead shows fiscal tiles: Residents, Elected, Commissions, Advisory, Departments, Total Budget, Total Revenue, City Employees, each with a year-over-year arrow, plus an "Explore budget" link.

**About.** The mission paragraph and links (Email, Twitter, Substack).

Right column: the graph, as described above.

### 3.2 Entity pages

Routes: `/[gov]/departments/[slug]`, `/[gov]/commissions/[slug]`, `/[gov]/advisories/[slug]`, `/[gov]/elected/[slug]`, `/[gov]/dept-heads/[slug]`.

Layout, verified on the Department of Justice page:

- Breadcrumb at the top of the canvas: "CivLab / US Gov / Executive".
- Large title, "Department of Justice".
- A description paragraph of two to four sentences. For US departments the enabling statute is written into the prose: "...it was established by the Act of June 22, 1870 (16 Stat. 162; 28 U.S.C. 501)."
- Two pill links side by side: `Legal Source` and `Official Website`.
- A current officeholder block: a small label with the position title ("Attorney General"), then a portrait card with name and appointment year ("Todd Blanche", "Appointed 2026"). When a body has many members (a chamber, a large board), this becomes a seat count and a grid of portrait cards with a "See all (N)" link.
- A `Part of` row of related-entity chips.
- Tabs: `News` and `Who's connected?` (Radix tablist, ids like `radix-...-trigger-news`). The News tab has a `Media` section: article cards with headline, date, source domain, and a "Load more" button. The "Who's connected?" tab lists adjacent entities and people as links, driven by `connectedNodes`.
- The canvas stays mounted and highlights this entity, drawing its edges to the hub in the accent color, with the entity name labeled at the bottom.

SF entity pages additionally show a `topicsWithRelevance` connection.

### 3.3 Topic pages

`/[gov]/topics` (a grid of cards: name, description, "View topic →") and `/[gov]/topics/[slug]`. A topic page has a breadcrumb, the topic title and description, a `News` feed of dated cards with image, headline, summary, and source, a `Who's Responsible?` list of entities, and a `Media` section. SF topics are homelessness, transit, public safety, education, and housing. The US graph ships no topics.

### 3.4 Request page

`/request` exists with empty props and a client-side form. It is a "request a government graph for your city" form. Not core to our product, but note it as a known surface.

### 3.5 Routes that do not exist

There is no `/people/` or `/person/` route. Person data is embedded inside entity nodes. The build manifest contains only: `/`, `/[gov]`, `/[gov]/advisories/[slug]`, `/[gov]/commissions/[slug]`, `/[gov]/departments/[slug]`, `/[gov]/dept-heads/[slug]`, `/[gov]/elected/[slug]`, `/[gov]/topics`, `/[gov]/topics/[slug]`, `/_app`, `/_error`, `/request`, and `/404`. There is no sitemap and no source-detail route. A source link such as `/20260916_uscirf_399` returns 404, so source ids resolve through an internal registry, not a public route. We should do better and expose a source page.

## 4. Data model observed in the sites

Every page embeds a full `__NEXT_DATA__` JSON payload. The relevant `pageProps` keys are `gov`, `data`, `overview`, `news`, `changes`, and `breadcrumb`. Because the whole graph ships on every page, one fetch yields the entire dataset. The US page is about 2.1MB, the SF page about 841KB.

### 4.1 `data` (the graph)

Top-level keys: `nodes` (a dict keyed by slug), `edges` (a dict keyed by an 8-hex-char id), `constituency` (one node id string), `elected`, `commissions`, `advisories`, `departments`, `deptHeads` (lists of node ids), `topics` (dict), `budget` (dict). The US graph adds `satellites` (a list of node ids for small bodies placed outside the main layout), `layout` (the string `"us-sectors"`), and `powerMap`.

Node counts observed: US has 460 `dept_head`, 426 `department`, 46 `commission`, 14 `advisory`, 5 `elected`, 1 `constituency`. SF has 59 `dept_head`, 56 `advisory`, 56 `department`, 54 `commission`, 11 `elected`, 1 `constituency`, with 237 nodes and 805 edges in total.

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

- `department` is a catch-all for any body: departments, agencies, courts, corporations. Sub-agencies are just child `department` nodes. The US "Departments & agencies 329" figure counts 339 sub-agencies underneath.
- `dept_head` is a position modeled as its own node, for example "Attorney General", with `headOf` pointing at the body. The body carries `head` pointing back.
- `constituency` is the electorate ("People of the United States", id `us-electorate`; "People of San Francisco", id `ccsf-electorate`). It has `elects` edges to elected offices.

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

Counts observed:
- US: appoints 565, dept_head 457, confirms 260, ex_officio 99, elects 20, oversees 12, advises 11, office 5, administers 4.
- SF: appoints 590, advises 72, dept_head 55, oversees 54, elects 23, office 11.

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

US values on the day observed: `vacantSeats` 6, `actingOfficials` 86, `lastChangeDate` 16-09-2026. The homepage copy claims three change kinds: appointment, departure, and structural change, but the observed items are all `kind: "personnel"`.

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

An array of `{ id, summary, url, publication }`. The `summary` string embeds entity links with a custom inline tag:

```
The <gov_entities='us-department-of-justice'>Justice Department</gov_entities> charged five...
```

The homepage renders those as inline links and appends numbered superscript citations that link to `url`. SF uses the same tag.

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

SF breakdown categories: Salaries, Mandatory Fringe Benefits, Non-Personnel Services, Services Of Other Depts, Materials & Supplies, Programmatic Projects, Debt Service, City Grant Program, Capital Outlay, Transfers Out, Facilities Maintenance. SF headline figures observed: Total Budget $16.85B, City Employees 34,151. Budget groups are functional ("General City Responsibilities", "General Administration & Finance", "Culture & Recreation", "Community Health", "Human Welfare & Neighborhood Development").

### 4.9 `topics`

```
{ <topicId>: { id, name, description, nodes: [nodeId, ...] } }
```

### 4.10 `powerMap` (US)

```
windowDays: 90, since, computedAt, articleCount: 964,
sources: [ "NPR Politics", "Government Executive", "Federal News Network" ],
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

`satellites` lists small bodies placed outside the main radial layout (for example PRRB, FERC, OCC, Benefits Review Board, Copyright Royalty Judges, various appeals boards, White House offices, and sub-agency units). `layout` is `"us-sectors"`, which selects the sector layout algorithm.

## 5. How the reference is built

Observed stack facts, useful because they tell us what not to over-build and where the real work is.

- Next.js with the **Pages Router**, not App Router. Data is server-rendered into `__NEXT_DATA__` with `page`, `query`, `buildId`, and `__NSSG`. An example `buildId` is `ewX7JnOwVSdX8fCOR0b_K`.
- Tailwind CSS with custom tokens (`type-ui-2`, `bg-grey-light`, `text-grey-1`, `rounded-[10px]`, `border-outline/70`) and dark variants.
- Radix UI primitives for the switch-graph dropdown, the tabs, and the route announcer.
- The graph and power map render as **inline SVG**, not canvas, and no d3, cytoscape, sigma, force-graph, recharts, or vis-network string appears in the page chunks inspected. Node glyphs render as `<path>` icons on concentric rings. The layout appears to be a custom, largely deterministic sector layout rather than a force simulation. (Two small chunks were inspected, so a layout library may live in a chunk we did not read. Treat the "custom SVG, sector-based" conclusion as high confidence but not proven.)
- Optimized images via `_next/image`. External images come from Wikimedia Commons, unitedstates.github.io, government sites, and news CDNs.
- Console noise on the live site includes repeated `<svg> attribute width/height: Expected length, "auto"` errors, a small bug we should avoid by setting explicit SVG dimensions.

## 6. Interactivity inventory (the checklist of things to build)

Reproduce all of these. Each is an observed behavior, not a guess.

1. Persistent right-canvas graph that stays mounted across navigation and re-highlights the current entity.
2. Graph pan and zoom on a large radial map. Ours is the concentric tier layout of ADR 0015, not the reference's single ring system; dragging outside the outermost tier turns the canvas like a dial.
3. Click a node to focus it, reveal its label and neighbors, and draw its path to the hub. Ours turns the canvas until the focus sits straight above the core and keeps every body in its place: the selection, its relations and its path light up where they are, their names are placed without overlap at one size on screen, and the view zooms to hold them and the core. The children of one body in a sector are a grid of dots that unpacks in place, as the reference does, with the neighbours on the ring sliding aside and one grid open at a time. The two Kamers are seated on their own ring, a wedge of seats per fractie. A details panel beside the canvas describes whatever is selected, body, group, fractie or sector (`web/lib/graph-layout.md` sections 5, 8 and 9). Clicking a sector selects the whole group and frames it.
4. `Graph` and `Power map` toggle that swaps the canvas view without a page load.
5. `Legend` dropdown that filters or annotates node types.
6. Global search overlay: expands from the top bar, dims the page, fuzzy-matches names and aliases, groups results under `Entities`, links each result.
7. `Switch government graph` dropdown that moves between graphs (`/us` and `/sf`) plus back and forward chevrons.
8. Light and dark theme toggle.
9. Latest News with inline entity links and numbered source citations, plus Read more and Show more.
10. `Who's in the news` strip feeding the power map via a callout button.
11. Latest Changes tabs `7D`/`30D`/`90D` that refilter the feed and the histogram.
12. Timeline histogram with per-day bars, counts, and an axis.
13. Change feed grouped by day with kind badges, source links, and OUT/IN rows.
14. Show all N changes.
15. Overview count lists with By Type and By Branch.
16. Entity page tabs `News` and `Who's connected?`.
17. News card list with Load more.
18. Topic grid and topic detail with `Who's Responsible?`.
19. Fiscal tiles with year-over-year indicators and an Explore budget entry.
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

## 8. What is out of scope for the clone

- Pixel-perfect visual replication. We match the information architecture and the interaction model, not the exact art.
- The `/request` lead form, unless wanted later.
- Reusing CivLab's prose, images, or code. We write original descriptions and use government and Commons sources.
- Any claim of affiliation with the Dutch government. We ship a disclaimer.

## 9. Open questions to resolve during recon

- Does the reference use a layout library in a chunk we did not inspect? Not important for us, because we will choose our own, but note it.
- How does the reference resolve a `sourceUrl` id to a human-visible source? It appears to be a data registry with no public route.
- What is the SF `data.constituency` id and the exact `topicsWithRelevance` item shape? Fetch one SF topic page and one SF entity page to confirm.
- What fields does the `/request` form collect? Fetch and record.

Record answers in `research/00-endpoints.md` when found.

## 10. Route map for the Dutch product

The reference routes are above. These are our routes. They mirror the reference structure and add the pages the reference lacks (person and position pages). Slugs follow `04-data-model.md` section 16.

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

