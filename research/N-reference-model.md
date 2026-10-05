# N. Reference data-model notes

Scope: workstream N of `docs/05-research-workstreams.md`. This file records what we learned about the shape of the data behind the reference product (the CivLab Gov Graph), which `docs/02-reference-system-spec.md` section 9 left open, and what it means for Staatsgraaf. It lists field names and value kinds as observed, because those describe a data model and help interoperability. It holds no records of the reference, no people, no image addresses and no code of the reference. Every example below is invented, written in the reference's vocabulary, and marked as such.

Staatsgraaf learns from the reference's information architecture; it does not copy its data or its expression (`docs/adr/0026-reference-product-and-credit.md`). Our own schema is in `docs/04-data-model.md` and `schema/v1`.

## 1. How the observations were made

On 18-09-2026 the public pages of the US graph, the San Francisco graph, one topic page and one entity page were viewed in a browser and their embedded page data was read. One request per page, no login, a pause between requests, no retry against a block. Working captures stayed on the maintainer's disk and are not part of the public repository.

The page data of every route holds the whole graph, so one page yields the full dataset. We used it to learn the shape of the model, not to take its content.

## 2. Page data envelope

The reference is a Next.js Pages Router app. Each page carries a page-data block whose useful part is a props object.

| Page | Props held |
| --- | --- |
| Home page | the government id, the graph, an overview, news, changes, a breadcrumb |
| Topic page | the graph, the topic, a selection, a breadcrumb, related entities, articles |
| Entity page | the graph, the entity, its members, a selection, a breadcrumb, articles, meetings |
| Request page | nothing |

Which blocks a government gets is switched by a per-government feature setting: the San Francisco graph has no changes feed, and the US graph has no overview and no topics. The home page component picks the overview layout when an overview exists, otherwise the news and changes layout.

The graph block has these top-level parts: nodes, edges, one constituency id, id lists per node type (elected, commissions, advisories, departments, department heads), topics, and a budget. The US graph adds a list of satellite bodies drawn outside the main layout, a layout name, and a power-map block.

## 3. Node shape

Every node carries the same set of fields, for all six node types and for both graphs.

- Identity and text: type, id, name, description, aliases.
- Relations: people (a wrapper holding a list), edges (ids), connected nodes (ids), a head position for bodies, and a body for head positions.
- Facts: employee count, department code, seat count, legal source URL, official URL, a featured person image.
- Topic links: a list of topic ids with a relevance score each (empty outside San Francisco).

Node types: elected, commission, advisory, department, dept_head and constituency.

The US graph adds five fields: a subtype, a sector (legislative, executive, independent or judicial), a list of children, a parent, and a level. Staatsgraaf has its own `subtype`, `branch`, `level` and `partOf` (`docs/04-data-model.md`), so no schema change follows.

Modeling notes.

- A department node is a catch-all for any body, including agencies, courts and corporations. Sub-agencies are child nodes.
- A head position is its own node, linked in both directions with the body it heads.
- A seat without a named holder is a placeholder entry in the body's people list, carrying only an id, a name and a type. That is how the reference shows a vacant seat.

Illustration (invented, not a record of the reference):

```json
{
  "type": "department",
  "id": "example-ministry",
  "name": "Example Ministry",
  "description": "One sentence about what the body does.",
  "people": { "type": "people", "people": [] },
  "edges": ["a1b2c3d4"],
  "connectedNodes": ["example-minister"],
  "head": "example-minister",
  "legalSourceUrl": "https://example.org/law",
  "officialUrl": "https://example.org",
  "aliases": [],
  "seatsCount": 1
}
```

## 4. Edge shape

An edge has an id (eight hex characters), a type, a from id, a to id, a metadata object and a count of seats appointed. The metadata keys differ by graph and carry details such as a seat number, a citation, a note or the basis of the relation. The key sets are wider than `docs/02` section 4.4 records and are not uniform, which is a reason to keep our own relation records typed (`schema/v1/relation.schema.json`).

Edge types observed: appoints, dept_head, confirms, office, ex_officio, elects, advises, oversees and administers. Not every type occurs in both graphs.

Illustration (invented):

```json
{ "id": "a1b2c3d4", "type": "appoints", "fromId": "example-minister",
  "toId": "example-advisory-board", "metadata": { "seat_number": 3 }, "seatsAppointed": 1 }
```

## 5. Person entry

A person entry inside a node has three variants.

- A named holder: id, name, position id, position name, type, start date, image URL and party.
- A seat placeholder: id, name and type only.
- An acting holder: the named-holder fields plus an `acting` flag.

The `type` value is `elected` or `appointed` only. Acting is a separate boolean, not a third type, which corrects `docs/02` section 4.3. No entry has an end date, so the reference infers "current" from presence. Staatsgraaf stores start and end dates and a stable person slug (`docs/04-data-model.md`).

## 6. Change item

The changes block has a generation date, a stats object (vacant seats, acting officials, last change date) and a list of items. Two item shapes exist.

- Personnel: kind, id, date, person name, position id and name, owning group, entry mode (appointed, acting or elected), a departure flag, the predecessor name and a source reference.
- Entity: kind, id, date, an event type, a description, predecessors and successors (id and name pairs), and a legal source name and URL.

The entity shape is rare. `docs/02` section 4.5 documents only the personnel shape.

Illustration of the entity shape (invented):

```json
{ "kind": "entity", "id": "event-1", "date": "2026-01-01", "eventType": "merged",
  "description": "Two bodies merged into one.",
  "predecessors": [{ "id": "example-a", "name": "Example A" }, { "id": "example-b", "name": "Example B" }],
  "successors": [{ "id": "example-c", "name": "Example C" }],
  "legalSourceName": "Example order", "legalSourceUrl": "https://example.org/order" }
```

## 7. Power-map block

Present in the US graph only. It holds the window in days, a start date, a computed-at time, an article count, the list of source publications, a list of people and a list of links.

- A person has an id, a name, a job, position and node ids, a party, an image URL, a rank, a total and recent mention count, twelve weekly counts, a heat score and a latest article (time, date, headline, source, URL).
- A link has an id, a type, two person ids and two node ids. `docs/02` section 4.10 omitted links.

Staatsgraaf has its own power-map bundle, computed at build time from news mentions and tenures (`docs/04-data-model.md` section 13), plus typed ties between people and bodies with reasons and evidence. Its fields are ours, and the connections view reads them (`web/components/power/`). News is linked to entities by the pipeline in `docs/adr/0021-news-relevance.md`.

## 8. Topics

Topics are a dictionary keyed by topic id with an id, a name, a description and a node list. A node's topic link list holds an id and a `relevance_score`, which corrects the key name used in `docs/02` sections 3.2 and 4.2. The US graph ships no topics.

## 9. Constituency

The constituency is one node id string: the electorate, a node of type constituency with no people, linked by elects edges to the elected offices. The San Francisco graph has one too, which closes that open question.

## 10. Layout and rendering

Question: does the reference use a layout library that `docs/02` section 5 did not inspect?

Answer: no graph-layout library. The layout is a custom, deterministic module in the app code, configured per government by a layout id, one for ring layouts and one for sector layouts. The configuration holds fixed ids and numbers for rings, sectors and the nodes placed on them, so the layout is computed, not simulated. A search of every script the pages load for common force, graph and canvas libraries found none; two small d3 utility packages (colour and scales) are bundled. The page build manifest lists only the page routes: no lazily loaded graph chunk and no source route.

For Staatsgraaf this changes nothing: our layout is our own (`web/lib/graph-layout.md`).

## 11. How a source reference resolves

Question: how does a change item's source reference become a visible source?

Answer: it does not. The reference writes the id straight into a relative link, which returns a not-found response on the live site, and no registry or route exists. The fix for Staatsgraaf is the source registry in `docs/04-data-model.md` section 14, with a page per source.

## 12. The request page

The `/request` page is a jurisdiction picker with an email field that asks for a graph to be built for a place. It is out of scope for Staatsgraaf.

## 13. The earlier version

The earlier San Francisco site is a different stack (Nuxt, with a headless CMS behind it), not a second Next.js graph. The open questions in `docs/02` section 9 apply to the current Next.js app only.

## 14. Open questions from docs/02 section 9, answered

1. Layout library: none, see section 10.
2. Source reference resolution: it does not resolve, see section 11.
3. San Francisco constituency id and topic relevance shape: answered in sections 8 and 9.
4. Request form: a jurisdiction picker plus email, see section 12.

## 15. Decisions

- Treat the reference's node field set as vocabulary to map, not as a schema to copy. Our schema keeps its own names where it already has them.
- Record `acting` as a boolean on a person or tenure, never as a `type` value (`docs/04-data-model.md` section 6). This corrects `docs/02` section 4.3.
- Record the entity change shape and the power-map links in `docs/02` as structure only. The orchestrator owns that file.

## 16. Gaps

- The department, commission, advisory and head-position page envelopes were not viewed. Only one entity page type was checked, so the others are inferred from route names and are unconfirmed.
- The member item shape of an entity page was read from the shared component code, not from a payload.
- The answers to `docs/02` section 9 belong in `research/00-endpoints.md`. File ownership puts that file with the orchestrator, so this workstream only reports them.

## 17. Corrections to docs/02 to carry through

| docs/02 claim | Observed on 18-09-2026 |
| --- | --- |
| The node field list has 17 entries | 18 base fields, and the US graph adds five more |
| Person `type` can be `elected`, `appointed` or `acting` | `type` is `elected` or `appointed`; acting is a flag; a placeholder shape exists |
| The power-map fields end at the latest article | The block also has a links list |
| Change items are all personnel | A small share are entity items |
| A topic link item is called `relevance` | The key is `relevance_score` |
