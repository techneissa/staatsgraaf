# N. Reference data-model reverse engineering

Scope: workstream N of `docs/05-research-workstreams.md`. This file confirms the reference data shapes that `docs/02-reference-system-spec.md` still marked uncertain, and gives one complete worked example each of a node, an edge, a person entry, a change item, and a power-map person. It answers or closes every open question in `docs/02-reference-system-spec.md` section 9.

Every claim below comes from a payload fetched live on 2026-09-18 and saved under `research/raw/N/`. Field names and short values are quoted as evidence; longer reference prose is truncated, not copied.

## 1. Sources fetched

| Artifact | URL | Retrieval | HTTP | Raw size | Saved as |
| --- | --- | --- | --- | --- | --- |
| US homepage payload | https://graph.civlab.org/us | 2026-09-18 | 200 | 2,095,500 B HTML, 2,032,958 B `__NEXT_DATA__` | `us.html.gz`, `us.nextdata.json` |
| US power-map slice | same payload | 2026-09-18 | 200 | 19,902 B | `us-powermap.json` |
| SF homepage payload | https://sfgov.civlab.org/sf, followed to https://graph.civlab.org/sf (308) | 2026-09-18 | 200 | 840,955 B HTML, 799,230 B `__NEXT_DATA__` | `sf.html.gz`, `sf.nextdata.json` |
| SF topic payload | https://graph.civlab.org/sf/topics/housing | 2026-09-18 | 200 | 946,290 B HTML, 893,424 B `__NEXT_DATA__` | `sf-topic-housing.html.gz`, `sf-topic-housing.nextdata.json` |
| SF entity payload | https://graph.civlab.org/sf/elected/ccsf-board-of-supervisors | 2026-09-18 | 200 | 985,083 B HTML, 913,563 B `__NEXT_DATA__` | `sf-entity-bos.html.gz`, `sf-entity-bos.nextdata.json` |
| Request page payload | https://graph.civlab.org/request | 2026-09-18 | 200 | 11,304 B HTML, 152 B `__NEXT_DATA__` | `request.html.gz`, `request.nextdata.json` |
| Request client chunk | https://graph.civlab.org/_next/static/chunks/pages/request-fe58c3443bb27f9b.js | 2026-09-18 | 200 | 359,235 B | `chunk-request-fe58c3443bb27f9b.js.gz` |
| App chunk (graph, sourceUrl, layout) | https://graph.civlab.org/_next/static/chunks/pages/_app-15c4c67b2b59cdac.js | 2026-09-18 | 200 | 616,006 B | `chunk-_app-15c4c67b2b59cdac.js.gz` |
| Shared component chunk | https://graph.civlab.org/_next/static/chunks/546-dc4533b299746cb7.js | 2026-09-18 | 200 | 22,561 B | `chunk-546-dc4533b299746cb7.js.gz` |
| Main runtime chunk | https://graph.civlab.org/_next/static/chunks/main-78ad880ae70b67c7.js | 2026-09-18 | 200 | 373,181 B | `chunk-main-78ad880ae70b67c7.js.gz` |
| Build manifest | https://graph.civlab.org/_next/static/ewX7JnOwVSdX8fCOR0b_K/_buildManifest.js | 2026-09-18 | 200 | 1,536 B | `_buildManifest.js.gz` |
| v2 SF page (Nuxt) | https://v2.sfgov.civlab.org/ | 2026-09-18 | 200 | 636,174 B HTML, 483 KB `__NUXT_DATA__` | `v2sf-root.html.gz`, `v2sf.nuxt-data.json` |

Also fetched for evidence, saved as gzipped chunks: `chunk-[gov]-67711936acf13613.js.gz`, `chunk-477-ec74ea5ca7388335.js.gz`, `chunk-webpack-d5e0105a4700f154.js.gz`.

Retrieval note: all fetches ran from the local machine on 2026-09-18. The server `Date` header on the first request was 2026-09-17T23:23:41Z, and the US payload carries `changes.generatedAt: "2026-09-17"` and `powerMap.computedAt: "2026-09-17T17:33:40.271Z"`. The reference build id is `ewX7JnOwVSdX8fCOR0b_K` for every page fetched. `sfgov.civlab.org/sf` now returns HTTP 308 to `graph.civlab.org/sf`; the earlier host is a redirect.

Extraction and fetch method: one `curl` GET per URL with a browser-like User-Agent, no cookies, 2 to 3 second gaps between requests, no retry against a block. The embedded `__NEXT_DATA__` script is parsed with a regular expression and re-saved as JSON. The v2 page has no `__NEXT_DATA__`; its `__NUXT_DATA__` script is saved as-is.

## 2. Payload envelope (confirmed)

Next.js Pages Router, as `docs/02` section 5 states. Every `__NEXT_DATA__` has `props.pageProps`, `page`, `query`, `buildId`, and `__NSSG`. The interesting part is `pageProps`.

| Page | `pageProps` keys |
| --- | --- |
| `/[gov]` US | `gov`, `data`, `overview`, `news`, `changes`, `breadcrumb` |
| `/[gov]` SF | `gov`, `data`, `overview`, `news` (null), `changes` (null), `breadcrumb` (null) |
| `/[gov]/topics/[slug]` | `gov`, `data`, `topic`, `selection`, `breadcrumb`, `relatedEntities`, `articles` |
| `/[gov]/elected/[slug]` | `gov`, `data`, `elected`, `members`, `selection`, `breadcrumb`, `articles`, `meetings` |
| `/request` | none, `pageProps` is `{}` |

The tenant config in the app chunk explains the nulls. SF has `features.changes:false`, US has `features.overview:false` and `features.topics:false`. The homepage component picks the overview layout when `overview` is set, otherwise the news and changes layout.

Data top-level keys:
- US: `nodes`, `edges`, `constituency`, `elected`, `commissions`, `advisories`, `departments`, `deptHeads`, `topics` (empty dict), `budget`, `satellites`, `layout`, `powerMap`.
- SF: `nodes`, `edges`, `constituency`, `elected`, `commissions`, `advisories`, `departments`, `deptHeads`, `topics`, `budget`. No `satellites`, `layout`, or `powerMap`.

Observed counts on 2026-09-18:

| Metric | US | SF |
| --- | --- | --- |
| nodes | 952 | 237 |
| edges | 1,433 | 805 |
| `satellites` | 346 ids | absent |
| `layout` | `us-sectors` | absent |

`elected`, `commissions`, `advisories`, `departments`, `deptHeads`, and `satellites` are lists of node id strings. `constituency` is a single node id string.

## 3. Node shape (confirmed)

Every node carries these 18 fields. This holds for all six node types and for both graphs.

```
type, id, name, description, people, edges, connectedNodes, employeeCount,
departmentCode, headOf, head, topicsWithRelevance, legalSourceUrl, officialUrl,
aliases, seatsCount, featuredPersonImageUrl
```

`people` is always an object `{ "type": "people", "people": [ ... ] }`. `edges` and `connectedNodes` are lists of ids. `headOf` points at a body on a `dept_head` node; `head` points at a `dept_head` node on a body. `topicsWithRelevance` is `[]` outside SF.

The US graph adds five fields that `docs/02` section 4.2 does not list:

| Field | Present on | Notes |
| --- | --- | --- |
| `subtype` | 489 of 952 nodes | Values seen: `legislature`, `chamber`, `adjudicative_body`, `regulatory_body`, `governing_board`, `advisory_body`, `government_corporation`, `department`, `quasi_official`, `court`, `military_service`, `series` |
| `sector` | 951 of 952 nodes | Values seen: `legislative`, `executive`, `independent`, `judicial`; null on the constituency |
| `children` | 67 nodes | List of child node ids |
| `parent` | 349 nodes | Parent node id |
| `level` | 349 nodes | Integer, values seen `1`, `2`, `3` |

The SF graph ships only the 18 base fields. `employeeCount` is always `{ "actual": ..., "budget": ... }`. In the US payload both sides are null on all 952 nodes. SF fills some: `actual` or `budget` is an object `{ "fiscalYear": 2027, "count": 82.36 }` on 50 and 48 nodes, and null otherwise.

Node type values confirmed: `elected`, `commission`, `advisory`, `department`, `dept_head`, `constituency`.

### Worked example: one complete node

`ca-sf-superior-court` from `research/raw/N/sf.nextdata.json`. This node is small enough to quote in full; long `description` values elsewhere are truncated in this document.

```json
{
  "type": "department",
  "id": "ca-sf-superior-court",
  "name": "SF Superior Court",
  "description": "San Francisco Superior Court",
  "people": {
    "type": "people",
    "people": [
      { "id": "ca-sf-superior-court-presiding-judge",
        "name": "SF Superior Court Presiding Judge",
        "type": "appointed" }
    ]
  },
  "edges": ["fb06f660", "5efbcb5e", "9adec4e7", "220eabc6", "30aabd95", "11677e8f"],
  "connectedNodes": [
    "ccsf-chief-adult-probation-officer", "ca-sf-civil-grand-jury-foreperson",
    "ca-sf-superior-court-presiding-judge", "sfll-law-library-board-of-trustees",
    "ccsf-electorate", "ccsf-adult-probation-department", "ca-sf-civil-grand-jury"
  ],
  "employeeCount": { "actual": { "fiscalYear": 2027, "count": 82.36 }, "budget": null },
  "departmentCode": "CRT",
  "headOf": null,
  "head": "ca-sf-superior-court-presiding-judge",
  "topicsWithRelevance": [],
  "legalSourceUrl": "https://leginfo.legislature.ca.gov/faces/codesTOCSelected.xhtml?tocCode=CONS",
  "officialUrl": "https://sf.courts.ca.gov/",
  "aliases": [],
  "seatsCount": 1,
  "featuredPersonImageUrl": "/gov_group_pictures/ca-sf-superior-court.jpg"
}
```

End to end, `head` resolves to the `dept_head` node `ca-sf-superior-court-presiding-judge`. That node has `headOf: "ca-sf-superior-court"` pointing back, and its `people.people[0].id` equals its own id, which marks the seat as a placeholder with no named holder. The `edges` list on the court contains the connecting edge `11677e8f` (`dept_head`, court to presiding judge) and `30aabd95` (`elects`, `ccsf-electorate` to court). So a single node plus its `edges` list yields the body, the head position, the electorate, and the people attached to the body.

## 4. Edge shape (confirmed)

```
id, type, fromId, toId, metadata, seatsAppointed
```

`id` is 8 lowercase hex characters. `metadata` is an object, sometimes `{}` or `null`. `seatsAppointed` is an integer and ranges from 0 to 435 in the US graph.

Edge types observed on 2026-09-18:

| Type | US | SF |
| --- | --- | --- |
| `appoints` | 565 | 590 |
| `dept_head` | 457 | 55 |
| `confirms` | 260 | 0 |
| `office` | 5 | 11 |
| `ex_officio` | 99 | 0 |
| `elects` | 20 | 23 |
| `advises` | 11 | 72 |
| `oversees` | 12 | 54 |
| `administers` | 4 | 0 |

These match `docs/02` section 4.4, except the SF `appoints` count there was 590 on 2026-09-17 and is still 590, and this fetch records `dept_head` 457 (US) and 55 (SF).

`metadata` key unions are much wider than `docs/02` section 4.4 records.

US keys, with counts: `source` 561, `cite` 395, `note` 379, `basis` 377, `issue` 115, `url` 82, `quote` 82, `self_selection` 41, `repointed_from` 22, `repointed_reason` 22, `shape` 8, `simplified` 4, `via` 3, `cite_url` 3, `researched` 3.

SF keys, with counts: `seat_number` 530, `advisory_entity` 430, `relationship_description` 122, `commission` 100, `advised_name` 65, `advised_type` 65, `advisory_name` 65, `commission_name` 57, `department_name` 57, `details` 21, `source` 9, `description` 4, `todo` 2.

### Worked example: one complete edge

Edge `30006011` from `research/raw/N/sf.nextdata.json`, an advisory seat appointment:

```json
{
  "id": "30006011",
  "type": "appoints",
  "fromId": "ccsf-city-administrator",
  "toId": "ccsf-residential-rehabilitation-area-citizen-advisory-committees-member-9",
  "metadata": {
    "seat_number": 9,
    "advisory_entity": "Residential Rehabilitation Area Citizen Advisory Committees"
  },
  "seatsAppointed": 1
}
```

A second, richer edge from `research/raw/N/us.nextdata.json` shows the US regulatory metadata:

```json
{
  "id": "20425240",
  "type": "appoints",
  "fromId": "us-speaker-of-the-house",
  "toId": "us-institute-of-american-indian-and-alaska-native-culture-and-arts-development",
  "metadata": {
    "cite": "20 U.S.C. 4412(a)(1)(B)(i)",
    "note": "\"2 Members of the House of Representatives appointed by the Speaker ...\"",
    "basis": "statute",
    "source": "20260908_phase_d3_seats"
  },
  "seatsAppointed": 2
}
```

## 5. Person entry (confirmed)

`node.people.people[]` has three observed shapes, not one. The base record is `id`, `name`, `type`. A named holder adds `positionId`, `positionName`, `startedAt`, `imageUrl`, `party`. An acting holder adds `acting: true`.

| Variant | Fields | Count (US) |
| --- | --- | --- |
| Named holder | `id, name, positionId, positionName, type, startedAt, imageUrl, party` | 804 |
| Seat placeholder | `id, name, type` | 218 |
| Acting holder | the named-holder fields plus `acting: true` | 165 |

`type` values confirmed are `elected` and `appointed` only. There is no `type: "acting"`. `docs/02` section 4.3 lists `type: "elected" | "appointed" | "acting"`, which is wrong on this point: acting is a separate boolean flag.

The seat placeholder uses the position id as its own id and the position title as its name, for example `{ "id": "us-member-of-the-provider-reimbursement-review-board-seat-1", "name": "Member of the Provider Reimbursement Review Board (Seat 1)", "type": "appointed" }`. This is how the reference represents a vacant seat with no person.

The SF graph has 616 person entries, 282 with the holder fields and 334 placeholders, and no `acting` flag anywhere. `party` is null in every SF entry seen.

### Worked example: one complete person entry

`ccsf-person-connie-chan` from `research/raw/N/sf.nextdata.json`, found under `ccsf-board-of-supervisors`:

```json
{
  "id": "ccsf-person-connie-chan",
  "name": "Connie Chan",
  "positionId": "ccsf-d1-supervisor",
  "positionName": "D1 Supervisor",
  "type": "elected",
  "startedAt": "2021-01-08",
  "imageUrl": "https://sfbos.org/sites/default/files/D01-Connie_Chan_2025_roster.png",
  "party": null
}
```

An acting holder from the US payload:

```json
{
  "id": "us-mary-lazare",
  "name": "Mary Lazare",
  "positionId": "us-assistant-secretary-for-aging",
  "positionName": "Assistant Secretary for Aging",
  "type": "appointed",
  "acting": true,
  "startedAt": "2025-03-01",
  "imageUrl": null,
  "party": null
}
```

There is no end date anywhere in a person entry, which matches `docs/02` section 4.3 and `docs/04` section 6.

## 6. Change item (confirmed)

`changes` has `generatedAt`, `stats`, and `items`. US values on 2026-09-18: `generatedAt: "2026-09-17"`, `stats: { "vacantSeats": 6, "actingOfficials": 86, "lastChangeDate": "2026-09-16" }`, 70 items. Two item shapes exist. `docs/02` section 4.5 documents only the personnel shape and notes all items were `kind: "personnel"`; the entity shape is also present, 1 of 70.

Personnel item fields: `kind`, `id`, `date`, `personName`, `positionId`, `positionName`, `groupId`, `entryMode`, `departure`, `predecessorName`, `sourceUrl`.
Entity item fields: `kind`, `id`, `date`, `eventType`, `description`, `predecessors` (list of `{id, name}`), `successors` (list of `{id, name}`), `legalSourceName`, `legalSourceUrl`.

`entryMode` values observed across personnel items: `appointed` 33, `acting` 17, `elected` 2, and null for 17 (which includes the entity item). `departure` is a boolean for personnel items and null for the entity item.

### Worked example: one personnel change item

```json
{
  "kind": "personnel",
  "id": "tenure-start-1466",
  "date": "2026-09-16",
  "personName": "Robert Barron",
  "positionId": "us-member-of-the-united-states-commission-on-international-religious-freedom-seat-2",
  "positionName": "Member of the United States Commission on International Religious Freedom (Seat 2)",
  "groupId": "us-united-states-commission-on-international-religious-freedom",
  "entryMode": "appointed",
  "departure": false,
  "predecessorName": null,
  "sourceUrl": "20260916_uscirf_399"
}
```

### Worked example: the entity change item

```json
{
  "kind": "entity",
  "id": "event-218",
  "date": "2026-07-10",
  "eventType": "reconstituted",
  "description": "Bureau of Ocean Energy Management and Bureau of Safety and Environmental Enforcement dissolved and merged ...",
  "predecessors": [
    { "id": "us-bureau-of-ocean-energy-management", "name": "Bureau of Ocean Energy Management" },
    { "id": "us-bureau-of-safety-and-environmental-enforcement", "name": "Bureau of Safety and Environmental Enforcement" }
  ],
  "successors": [
    { "id": "us-marine-minerals-administration", "name": "Marine Minerals Administration" }
  ],
  "legalSourceName": "Interior Secretarial Order 3451 (2026-07-10): BOEM and BSEE merged into the Marine Minerals Administration",
  "legalSourceUrl": "https://www.doi.gov/document-library/secretary-order/so-3451"
}
```

## 7. Power-map (confirmed)

`data.powerMap` is present only in the US payload. Top-level keys: `windowDays`, `since`, `computedAt`, `articleCount`, `sources`, `people`, `links`. `docs/02` section 4.10 omits `links`. Observed values: `windowDays: 90`, `since: "2026-06-20"`, `computedAt: "2026-09-17T17:33:40.271Z"`, `articleCount: 964`, `sources: ["NPR Politics", "Government Executive", "Federal News Network"]`, 20 people, 7 links.

Person fields: `id`, `name`, `job`, `positionId`, `party`, `nodeId`, `bodyNodeId`, `imageUrl`, `rank`, `total`, `recent`, `weeks`, `heat`, `latest`. This matches `docs/02` section 4.10. `weeks` is 12 integers. `latest` is `{at, date, headline, source, url}`.

Link fields: `id`, `type`, `fromPersonId`, `toPersonId`, `fromNodeId`, `toNodeId`. This is the missing `links` shape.

### Worked example: one power-map person

```json
{
  "id": "us-donald-j-trump",
  "name": "Donald J. Trump",
  "job": "President of the United States",
  "positionId": "us-president-of-the-united-states",
  "party": "Republican",
  "nodeId": "us-president-of-the-united-states",
  "bodyNodeId": "us-the-executive-office-of-the-president",
  "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/.../960px-....jpg",
  "rank": 1,
  "total": 219,
  "recent": 31,
  "weeks": [0, 0, 0, 8, 26, 26, 27, 26, 26, 26, 23, 31],
  "heat": 1.8199608610567517,
  "latest": {
    "at": "2026-09-17T12:34:18.88948+00:00",
    "date": "2026-09-17",
    "headline": "D.C. airspace is complicated. Experts say Trump's arch would add one more risk",
    "source": "NPR Politics",
    "url": "https://www.npr.org/2026/09/17/nx-s1-5950462/trump-arch-dca-planes-safety-concerns-faa"
  }
}
```

### Worked example: one power-map link

```json
{
  "id": "c982c54d",
  "type": "appoints",
  "fromPersonId": "us-donald-j-trump",
  "toPersonId": "us-todd-blanche",
  "fromNodeId": "us-president-of-the-united-states",
  "toNodeId": "us-attorney-general"
}
```

## 8. Topics and topicsWithRelevance (confirmed)

`data.topics` is a dict keyed by topic id: `{ id, name, description, nodes }`. The SF topic ids are `homelessness`, `transit`, `public_safety`, `education`, `housing`. The US graph ships `topics: {}`.

The topic page adds `topic` (the same object), `selection`, `breadcrumb`, `relatedEntities`, `articles`. `selection` for a topic is `{ "type": "topic", "topicId": "housing" }`. `relatedEntities` is the topic's node objects, not just ids.

`node.topicsWithRelevance` is a list of `{ id, relevance_score }`. This corrects `docs/02` section 3.2 and 4.2, which calls the item `relevance`. Confirmed on `ccsf-board-of-supervisors`:

```json
[
  { "id": "housing", "relevance_score": 1 },
  { "id": "homelessness", "relevance_score": 1 },
  { "id": "transit", "relevance_score": 1 },
  { "id": "public_safety", "relevance_score": 1 },
  { "id": "education", "relevance_score": 0.25 }
]
```

## 9. Constituency (confirmed)

`data.constituency` is a node id string. US is `us-electorate`, node name "People of the United States". SF is `ccsf-electorate`, node name "People of San Francisco". Both nodes have `type: "constituency"`, empty `people.people`, and `elects` edges to elected offices. This confirms the SF id the open question asked for.

## 10. Open question: layout library and graph rendering

Question: does the reference use a layout library in a chunk that `docs/02` section 5 did not inspect?

Answer: no graph-layout library. The layout is a custom, deterministic module inside the `_app` chunk. The `_app` chunk defines a config map with two entries keyed `"sf-rings"` and `"us-sectors"`.

The `sf-rings` entry sets `mode: "rings"` and a `rings` list. Each ring has `bucket`, `spacing`, `label`, and `sizeMetric`, for the buckets `elected` (spacing 1.4), `commission` (2.25), `advisory` (2.68), and `department` (3.15).

The `us-sectors` entry sets `mode: "sectors"`, a `rings` list, and a `sectors` list with `id`, `label`, and `minAngleDeg` for `legislative` (38), `executive` (120), and `judicial` (56). It also carries `sectorGapDeg`, `sectorAliases` (which folds `independent` into `executive`), `depthMode`, `apexNodeIds`, `functionalRings` (with `oversight` and `agencies` radii), and `congressPill` and `cabinetPill` objects that name the nodes placed in each pill. These are short field names and config values from the minified chunk, quoted as evidence. The `data.layout` string (`us-sectors`) selects one entry. SF selects `sf-rings` through its tenant config `layoutId`, not through `data.layout`, which is absent. The sectors, angles, ring spacing, pills, and apex node are hardcoded ids and numbers, so the layout is computed, not simulated.

Searches across every chunk referenced by the US page and the build manifest for `d3-force`, `forceSimulation`, `forceCenter`, `forceLink`, `forceManyBody`, `forceCollide`, `dagre`, `elkjs`, `graphology`, `cytoscape`, `sigma`, `vis-network`, `react-force-graph`, `konva`, `pixi` return zero hits. Two d3 utility packages are bundled, likely for color and scales in the power map: d3-color (`formatHex`, the named-color table) and d3-scale or d3-array (`tickFormat`, `ticks`, and a continuous `copy()` with `domain/range/interpolate/clamp/unknown`). No d3 layout module is present.

The build manifest lists only these page chunks: `/404`, `/_error`, `/request`, `/[gov]`, `/[gov]/advisories/[slug]`, `/[gov]/commissions/[slug]`, `/[gov]/departments/[slug]`, `/[gov]/dept-heads/[slug]`, `/[gov]/elected/[slug]`, `/[gov]/topics`, `/[gov]/topics/[slug]`. There is no lazily loaded graph chunk and no source route.

## 11. Open question: how a sourceUrl id resolves

Question: how does the reference resolve a `sourceUrl` id like `20260916_uscirf_399` to a human-visible source?

Answer: it does not. There is no registry and no route. The app chunk assigns the id straight to the anchor, `x = "personnel" === c.kind ? c.sourceUrl : c.legalSourceUrl`, and renders `<a href={x} target="_blank" rel="noopener noreferrer" title="Source">`. The rendered HTML on the US homepage confirms `href="20260916_uscirf_399"`, a relative URL. The id never appears as a key anywhere in the payload; the only `sources` array in the payload is `powerMap.sources`, the list of publication names.

Live checks on 2026-09-18, all HTTP 404: `https://graph.civlab.org/20260916_uscirf_399`, `https://graph.civlab.org/20260916_acting_sweep_396`, `https://graph.civlab.org/us/20260916_uscirf_399`, `https://graph.civlab.org/source/20260916_uscirf_399`. The build manifest has no source route. The change item's source link is broken, exactly as `docs/02` section 3.5 and section 7 state. There is nothing to reverse-engineer; the fix for our product is the `src:` registry in `docs/04` section 14.

## 12. Open question: /request form fields

Question: what fields does the `/request` form collect?

Answer: `pageProps` is `{}` and the form is client-rendered in `chunk-request-fe58c3443bb27f9b.js.gz`. It is a jurisdiction picker, not a free-text lead form.

| Control | Evidence from the chunk |
| --- | --- |
| Jurisdiction search | `placeholder:"Search a country, US state, or US city…"`, `aria-label:"Search for a jurisdiction"`, with a typeahead list and arrow-key and Enter handling |
| Email | `type:"email"`, `placeholder:"you@example.com"`, `aria-label:"Email for launch notification"` |
| Submit | button label `"Request this graph"`, and `"Requesting…"` while pending |
| Submission | `POST /api/v1/graph-requests` with body `{ jurisdictionId: <id>, email: <trimmed email or undefined> }` |
| Local state | `localStorage` key `civlab.graphRequests.requested` holds the ids already requested |

There is no message, organization, or notes field. The page title is `CivLab · Request a Gov Graph`. The jurisdiction list is built into the chunk (countries, US states, US cities) and each entry has `{ id, label, lat, lng, topoName }` or a city variant, which drives a world map of request counts.

## 13. The v2 site

`v2.sfgov.civlab.org` is not the same stack. It responds with `x-powered-by: Nuxt` and has no `__NEXT_DATA__`. It embeds Nuxt 3 devalue state in `<script id="__NUXT_DATA__">`, saved as `research/raw/N/v2sf.nuxt-data.json`. The decoded state has a `data` object keyed by Sanity CMS document types: `advisory`, `civilian`, `commission`, `commissioner`, `department`, `departmentHead`, `elected`, `relationship`. So v2 is a Sanity-backed Nuxt app, not a second Next.js graph. The `docs/02` section 9 open questions about `__NEXT_DATA__`, the layout library, and `topicsWithRelevance` apply to the v3 Next.js app, and v2 cannot answer them.

## 14. Open questions from docs/02 section 9, answered

1. Layout library in an uninspected chunk. Closed. No layout library. Custom sector and ring layout in the `_app` chunk, with `us-sectors` and `sf-rings` config objects. d3-color and d3-scale or d3-array utilities are bundled for other work, but no d3-force, dagre, elk, cytoscape, sigma, or vis-network. See section 10.
2. How a `sourceUrl` id resolves. Closed. It does not resolve. The id is used verbatim as a relative `href` and 404s. There is no registry or route. See section 11.
3. SF `data.constituency` id and the `topicsWithRelevance` item shape. Answered. `ccsf-electorate`, and `{ id, relevance_score }`. See sections 8 and 9.
4. `/request` form fields. Answered. Jurisdiction picker plus email, posting `{ jurisdictionId, email }` to `/api/v1/graph-requests`. See section 12.

## 15. Decisions

- Treat the 18 base node fields as the canonical reference vocabulary, and the five US-only fields (`subtype`, `sector`, `children`, `parent`, `level`) as reference extras. Our `docs/04` schema already has its own `subtype`, `branch`, `level`, and `partOf`, so no schema change is needed. Recorded here for the mapping in `docs/03`.
- Record `acting` as a boolean on a person or tenure, never as a `type` value. This matches `docs/04` section 6 (`acting: true`) and corrects `docs/02` section 4.3.
- Record the missing `powerMap.links` array and the entity change item shape in `docs/02`. The orchestrator owns that file, so this workstream only reports them.

## 16. Gaps

- No `/[gov]/people` or person route in the build manifest. Person data is embedded in nodes only, as expected. No gap.
- The US department entity page, the commissions, advisories, and dept-head page envelopes were not fetched. Only the SF `elected` entity envelope was confirmed. The other entity routes likely use the same `selection: { type: "entity", entityId }` shape plus a type-specific key, but that is inferred from the `elected` page and the route naming, not verified. This is a small named gap.
- SF `members` was empty on the fetched `elected` page, so the full member item shape was read from the shared component chunk, not from a payload: `positionId`, `positionName`, `holderName`, `imageUrl`, `party`, `vacant`. A payload example from a large commission page would confirm it.
- The `docs/02` section 9 answers belong in `research/00-endpoints.md` per that document, but file ownership puts that file with the orchestrator and this workstream may touch only `research/N-reference-model.md` and `research/raw/N/**`. The orchestrator should port sections 10 to 12 into `research/00-endpoints.md`.
- `sfgov.civlab.org/sf` is now a 308 redirect to `graph.civlab.org/sf`. The build id is unchanged from `docs/02` (`ewX7JnOwVSdX8fCOR0b_K`), so the model did not change, only the host.

## 17. Corrections to docs/02 to carry through

| docs/02 claim | Observed on 2026-09-18 |
| --- | --- |
| Node fields list has 17 entries | 18 base fields; US adds `subtype`, `sector`, `children`, `parent`, `level` |
| Person `type: "elected" | "appointed" | "acting"` | `type` is `elected` or `appointed`; `acting` is a separate boolean; a third placeholder shape has only `id`, `name`, `type` |
| `powerMap` fields end at `latest` | `powerMap` also has a `links` array |
| Change items are all `kind: "personnel"` | 1 of 70 is `kind: "entity"` with `eventType`, `predecessors`, `successors`, `legalSourceName`, `legalSourceUrl` |
| `topicsWithRelevance` item called `relevance` | key is `relevance_score` |
| US payload about 2.1MB, SF about 841KB | unchanged: 2,095,500 B and 840,955 B HTML |
