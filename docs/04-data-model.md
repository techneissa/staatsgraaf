# Canonical data model

This is the single schema the whole project agrees on. Research workstreams fill it, the merge phase validates it, the site reads it, and the pipelines diff it. Change it only through the process in section 9.

The shapes below are illustrative JSON for documentation. They are not code. Do not copy them into a schema file and stop; the schema file, the loaders, and the validators all derive from this document.

## 1. Principles

1. **One normalized dataset, one file per entity type**, all validated against one schema.
2. **Facts carry sources.** Every non-trivial value points to at least one source URL with a retrieval date and a confidence. A fact with no source does not ship.
3. **Stable ids and slugs.** Ids never change once published. Slug changes get a redirect.
4. **Time is explicit.** Every tenure has a start, and an end only when it has actually ended. No inferred current state. When a source names the current holder but not when the tenure began, `start` is null rather than guessed (ADR 0020).
5. **Dutch meaning, English keys.** Values that are Dutch institutions keep their Dutch names. Field names are English.
6. **The graph is derived, not stored twice.** Relations live once, as edges. Adjacency lists are computed at build time.

## 2. Top-level layout

A future `data/` directory holds one file per type:

```
data/
  governments.json        the scopes, for example nl, nl-rijk, and later aruba
  organizations.json      every body: ministeries, ZBO's, gemeenten, waterschappen, and so on
  positions.json          every seat or role
  people.json             every person in a public function
  tenures.json            person fills position over a date range
  relations.json          typed edges between entities
  memberships.json        seat-level membership for large bodies
  changes.json            the dated change stream
  news.json               recent articles with entity links
  topics.json            cross-cutting issue areas
  budgets.json            spending and revenue per organization
  media.json              image assets with license and credit
  sources.json            every source URL, deduplicated, with retrieval metadata
```

The reference ships one big `nodes`/`edges` blob on every page. We keep normalized files for research and validation, then precompute one denormalized bundle per page at build time so the runtime is fast.

## 3. Organization

Every body is an organization. This includes the coarse reference types plus the Dutch subtypes.

```json
{
  "id": "org:ministerie-van-financien",
  "slug": "ministerie-van-financien",
  "name": "Ministerie van Financiën",
  "aliases": ["Financiën", "FIN", "het ministerie van Financien"],
  "type": "department",
  "subtype": "ministerie",
  "branch": "regering",
  "level": "rijk",
  "country": "nederland",
  "parent": "org:rijksoverheid",
  "partOf": ["org:rijksoverheid"],
  "description": "original 2-4 sentence summary in Dutch",
  "legalSource": { "label": "Grondwet art. 44", "url": "https://wetten.overheid.nl/..." },
  "website": "https://www.rijksfinancien.nl",
  "established": "1798-01-01",
  "dissolved": null,
  "seatsCount": null,
  "employeeCount": { "budgeted": null, "actual": null, "year": null },
  "images": ["media:...", "media:..."],
  "logoEmbed": { "url": "https://...", "page": "https://...", "retrieved": "2026-10-13", "linkOnly": false },
  "address": { "street": "Korte Voorhout 7", "postcode": "2511 CW", "city": "Den Haag", "country": "Nederland", "building": null, "source": "src:koop-oo-export", "retrieved": "2026-10-16" },
  "sources": [{ "source": "src:...", "retrieved": "2026-09-17", "confidence": "high" }]
}
```

Field rules:

- `type` is the reference vocabulary: `department`, `elected`, `commission`, `advisory`, `dept_head`, `constituency`, plus `person` is not an organization.
- `subtype` is the Dutch meaning from `03-dutch-government-model.md` section 4.
- `branch` is a Dutch branch label: `regering`, `staten-generaal`, `rechterlijke-macht`, `hoge-colleges`, `adviescolleges`, `decentraal-provinciaal`, `decentraal-lokaal`, `waterschap`, `caribisch-nederland`, `koninkrijk`, `zelfstandig`.
- `level` is `rijk`, `provinciaal`, `regionaal`, `lokaal`, `caribisch`, `koninkrijk`.
- `parent` and `partOf` are organization ids. `partOf` is a list because an organization can sit within more than one structure.
- `legalSource` is a single primary link. More legal links live in `sources`.
- `established` and `dissolved` are ISO dates or null.
- `address` is the visiting address of the body's main office, for the map link on its page (Google Maps, or Apple Maps on Apple devices). It comes from the Register van Overheidsorganisaties, else from the body's own contact page, and `source` names the record it came from. A council or board that meets at the office of the body it governs (a gemeenteraad, Provinciale Staten, a college) has no address of its own; the page shows the governed body's. Added 16-10-2026 (`research/desc/describe-bodies.py`).
- `logoEmbed` is the official logo as published on the body's own site, for a body without a licensed emblem in `images` (ADR 0029, amendment 1). The browser loads `url` from that site; nothing is copied and no licence is claimed, so it is not a media record. `page` is where the logo appears and is linked in the (i). With `linkOnly: true` the body reserved copyright on its logo, `url` is null and only the link shows. Every embed host must be in the `img-src` of `web/public/_headers`.

## 4. Position

A position is a seat or role, not a person. A body can have several positions.

```json
{
  "id": "pos:minister-van-financien",
  "slug": "minister-van-financien",
  "title": "Minister van Financiën",
  "organization": "org:ministerie-van-financien",
  "type": "dept_head",
  "fillMethod": "koninklijk-besluit",
  "entryModes": ["benoemd"],
  "termLengthMonths": null,
  "seatsCount": 1,
  "legalBasis": { "label": "Grondwet art. 43", "url": "https://wetten.overheid.nl/..." },
  "exOfficioOf": [],
  "sources": []
}
```

- `fillMethod` is one of `verkiezing`, `koninklijk-besluit`, `benoeming-door-college`, `benoeming-door-minister`, `van-rechtswege`, `cooptatie` where applicable.
- `exOfficioOf` lists organization ids where the holder chairs or sits by operation of law.

## 5. Person

We give people their own file and, unlike the reference, their own pages.

```json
{
  "id": "person:...",
  "slug": "...",
  "name": "...",
  "aliases": [],
  "portrait": "media:...",
  "birthDate": null,
  "party": "VVD",
  "wikipedia": "https://nl.wikipedia.org/wiki/...",
  "wikidata": "Q...",
  "description": "original one to two sentence note when public and useful",
  "sources": []
}
```

Keep personal data to what the government publishes. `birthDate` is optional and only when officially published. No addresses, no contact details, no private family data.

## 6. Tenure

The join between a person and a position or a seat, over a date range. This is the heart of the model and the thing the reference does worst.

```json
{
  "id": "tenure:...",
  "person": "person:...",
  "position": "pos:...",
  "seat": null,
  "start": "2026-02-23",
  "end": null,
  "acting": false,
  "entryMode": "benoemd",
  "appointedBy": "org:regering",
  "predecessor": "tenure:...",
  "successor": null,
  "endReason": null,
  "source": { "source": "src:...", "retrieved": "2026-09-17" }
}
```

- `end: null` means current. Never infer an end from the appearance of a successor; store it only when a source states it.
- `acting: true` marks a waarnemer.
- `predecessor` and `successor` form the chain that lets the change feed show OUT and IN. They are tenure ids, not person ids.
- `endReason` is `aftreden`, `ontslag`, `einde-termijn`, `overlijden`, `reorganisatie`, or null.

## 7. Membership (seats in large bodies)

For bodies with many seats, a separate membership record avoids one tenure per seat when only the seat number matters.

```json
{
  "id": "membership:...",
  "organization": "org:tweede-kamer",
  "person": "person:...",
  "seatNumber": 23,
  "fractie": "VVD",
  "start": "2023-12-06",
  "end": "2024-07-02",
  "source": { "source": "src:...", "retrieved": "2026-09-17" }
}
```

Tweede Kamer, Eerste Kamer, Provinciale Staten, gemeenteraden, waterschapsbesturen, and eilandsraden all use this shape. A person can hold a membership in more than one body across time.

## 8. Relation (the edges)

One list of typed, directed edges. This drives the graph and the "Who's connected?" panels.

```json
{
  "id": "rel:...",
  "from": "org:ministerie-van-financien",
  "to": "org:belastingdienst",
  "type": "oversees",
  "metadata": { "instrument": "eigenaarschap" },
  "validFrom": "2019-01-01",
  "validTo": null,
  "supersededBy": null,
  "seatsAppointed": 0,
  "source": { "source": "src:...", "retrieved": "2026-09-17" }
}
```

`type` uses the reference vocabulary plus the Dutch additions. The full allowed set:

- `elects`: electorate to elected body.
- `appoints`: body or person appoints a position or another body.
- `oversees`: supervision.
- `advises`: advisory mandate.
- `office`: a position belongs to a body.
- `dept_head`: a head position heads a body.
- `confirms`: consent or voordracht.
- `ex_officio`: chairs or sits by operation of law.
- `administers`: executes for.
- `subsidises`: funds.
- `accountable_to`: the verantwoordingslijn.
- `part_of`, `consists_of`: composition.
- `succeeded_by`: reorganization history.
- `joint_arrangement_member`: participant in a gemeenschappelijke regeling.

Relations are dated like tenures, because Dutch portfolios move between ministeries with each kabinet. `validFrom` opens the relation and `validTo` closes it; both are null when no source dates the relation, and `validTo: null` means the relation is current. `supersededBy` names the relation that replaced a closed one. Never infer a relation's end from the appearance of a replacement; store `validTo` only when a source states it. A closed relation stays in the dataset so history renders, and the diff engine records the move as a change. (Until 19-09-2026 the fields were documented as `metadata.since` and `until`; no record used them, so the rename has no data migration.)

## 9. Change

The dated stream that makes the product feel alive. Each change is derived from a diff between two dataset snapshots, then linked to its source.

```json
{
  "id": "change:20260916-...",
  "date": "2026-09-16",
  "kind": "tenure-between" | "appointment" | "departure" | "structural" | "vacancy" | "rename" | "move",
  "position": "pos:...",
  "organization": "org:...",
  "out": { "tenure": null, "person": null, "label": "Geen voorganger bekend" },
  "in": { "tenure": "tenure:...", "person": "person:...", "label": "..." },
  "summary": "one line, Dutch, original",
  "source": { "source": "src:...", "retrieved": "2026-09-17" }
}
```

`stats` is computed, not stored: `vacantSeats`, `actingOfficials`, `lastChangeDate`, and per-window counts for 7, 30, and 90 days.

## 10. NewsItem

```json
{
  "id": "news:...",
  "title": "...",
  "url": "...",
  "publisher": "NOS",
  "published": "2026-09-16T07:12:00+02:00",
  "language": "nl",
  "publisherKind": "publieke-omroep",
  "scope": "politiek",
  "summary": "een of twee originele zinnen",
  "summaryMarkup": "De <entity id=\"org:...\">Belastingdienst</entity> ...",
  "entities": ["org:...", "person:..."],
  "topics": ["topic:..."],
  "keywords": ["Belastingdienst", "Heinen"],
  "image": "media:...",
  "sources": []
}
```

`language` is the language the outlet published in, `nl` or `en`; absent means `nl`. Nothing is machine-translated. `publisherKind` is the kind of outlet from the feed registry `pipelines/feeds.json`: `publieke-omroep`, `krant`, `commerciele-omroep`, `online`, `video`, `nieuwsbrief`, `blog`, `vakmedia`, or `overheid`; absent means `online`. `keywords` are the alias strings the linker matched, in match order, so a reader can see why an entity was linked. All three were added on 18-09-2026 as optional fields under section 18; older records without them stay valid. `scope` is optional and has one value, `politiek`: the news run sets it when the item comes from a feed or section that is wholly about Dutch politics and government (a `scope: "politiek"` entry in the feed registry) and its text does not point abroad. It makes the item relevant by source (`docs/adr/0021-news-relevance.md`, amendment 06-10-2026); a record with `publisherKind` `overheid` is relevant by source without it. `scope` is never a link, and nothing in a feed's content sets it; only our registry does. Absent means no scope, and records written before 06-10-2026 stay valid.

The summary markup is our own, a plain tag with an entity id, so the frontend can render inline links from structured markup of our own.

## 11. Topic

```json
{
  "id": "topic:...",
  "slug": "...",
  "name": "Wonen",
  "description": "original",
  "organizations": ["org:...", "org:..."],
  "positions": ["pos:..."],
  "keywords": ["huur", "woningmarkt", "corporaties"],
  "trending": true
}
```

`keywords` feed the news linker. `organizations` is the "Wie is verantwoordelijk?" list.

## 12. Budget

Per organization, with history and a current breakdown. Dutch fiscal facts differ from the US, so keep the source's own year and label.

```json
{
  "organization": "org:ministerie-van-financien",
  "fiscalYear": 2026,
  "current": { "spendingBudget": 0, "spendingActual": 0, "revenue": 0, "net": 0, "nonprofit": 0 },
  "previous": { "spendingBudget": 0, "spendingActual": 0, "revenue": 0, "net": 0, "nonprofit": 0 },
  "history": [ { "fiscalYear": 2017, "spendingActual": 0, "revenue": 0 } ],
  "breakdown": [ { "category": "Salarissen", "amount": 0, "type": "spending" } ],
  "rankings": { "spending": { "rank": 1, "total": 0 } },
  "sources": []
}
```

Use `rijksfinancien.nl` and the begrotingswet as the primary sources. Keep cent or euro precision exactly as the source reports it and store the unit.

## 13. PowerMap

Computed at build time from news mention counts and tenures, not hand-entered.

```json
{
  "windowDays": 90,
  "since": "2026-06-18",
  "computedAt": "2026-09-17T06:00:00+02:00",
  "articleCount": 0,
  "sources": ["NOS", "NRC", "AD"],
  "people": [
    {
      "person": "person:...",
      "name": "...",
      "job": "...",
      "position": "pos:...",
      "party": "...",
      "node": "org:...",
      "image": "media:...",
      "rank": 1,
      "total": 0,
      "recent": 0,
      "weeks": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "heat": 0,
      "latest": { "date": null, "headline": null, "source": null, "url": null }
    }
  ]
}
```

## 14. Source

One deduplicated record per source URL. This closes the reference's biggest gap, where change items link to a 404.

```json
{
  "id": "src:...",
  "url": "...",
  "title": "...",
  "publisher": "...",
  "type": "wet" | "kb" | "api" | "page" | "news" | "register",
  "published": null,
  "retrieved": "2026-09-17",
  "license": "CC0",
  "archiveUrl": null,
  "notes": null
}
```

Everything that cites a source uses the `src:` id. The UI renders a link and, where possible, an archived copy.

## 15. Media

```json
{
  "id": "media:...",
  "url": "...",
  "type": "portrait" | "logo" | "photo",
  "license": "CC BY-SA 4.0",
  "credit": "Wikimedia Commons",
  "author": "...",
  "width": 800,
  "height": 1000,
  "source": "src:..."
}
```

`url` is either an absolute URL or a site-relative path under `/media/`. The content security policy allows images from the own origin only, so an external image is not hotlinked: the pipeline downloads it into `web/public/media/` and the record points at the local copy. Every media record carries a license and a credit line in `credit`, and `author` names the maker where the source states one. An image without a license or without a credit does not ship (`research/O-licenses.md`). The interface shows the credit and the license next to the image it belongs to.

## 16. Id and slug conventions

- Ids are `type:stable-key` with a type prefix: `org:`, `pos:`, `person:`, `tenure:`, `membership:`, `rel:`, `change:`, `news:`, `topic:`, `media:`, `src:`.
- Slugs are lowercase ASCII with hyphens. One slug namespace per type. Person slugs include a disambiguator only when needed.
- Slugs, once published, never change. A rename adds an alias and, if the slug must change, a redirect record.

## 17. Referential integrity rules (enforced in CI)

1. Every `org.parent`, `org.partOf`, `pos.organization`, `tenure.person`, `tenure.position`, `membership.organization`, `membership.person`, and relation `from`/`to` resolves to an existing id.
2. No two organizations, positions, or people share a slug.
3. Every membership has a `start`. Every tenure has a `start`, which is null only when the source gives none (ADR 0020).
4. Every tenure end is after its start, where both are known.
5. Every provenance entry resolves to an existing `src:` id.
6. No fact that ships lacks at least one source.
7. `changes` entries reference existing positions and, where present, existing persons and tenures.
8. `budget` and `powerMap` reference existing organizations and people.
9. Relation `validTo` is after `validFrom`, `supersededBy` resolves, and no two open relations share `from`, `to` and `type`.
10. Election seats sum to `seatsTotal`, no party is listed twice, the body resolves, and every party key exists in `web/lib/parties.ts`.
11. Coalition `end` is after `start`; `government`, `primeMinister` and `agreement` resolve; every party key exists in `web/lib/parties.ts`.

## 18. Changing the schema

The schema follows the process below. This prevents workstreams from drifting and keeps the merge deterministic.

1. A workstream that needs a new field or value writes a proposal note in its markdown file with the field, the reason, and a real example.
2. The orchestrator accepts or rejects at the merge gate and records the decision in `research/merge-log.md`.
3. An accepted change updates this document, the schema file, and the validators in one commit, before any consumer uses the new field.
4. Rerun validation across all data so the change does not silently break older workstreams.

## 19. Known modeling decisions and their reasons

- **`department` stays a catch-all** for compatibility with the reference and because the graph engine only cares about type for styling. The real meaning lives in `subtype`.
- **People are a first-class entity.** The reference buries them in nodes and has no person pages. Our product's promise is tenure history, so people must be first-class.
- **Kingdoms and lands are scopes, not organizations.** They sit in `governments.json` so we can later ship an Aruba or Curaçao graph on the same schema.
- **Elections and coalitions are entities since 19-09-2026** (sections 21 and 22, added by the graph rebuild plan in `13-graph-rebuild-plan.md`). The electorate stays a constituency and the elected bodies stay organizations; an election records a zetelverdeling for one body on one date, a coalition records one kabinet. Neither becomes a graph node.

## 20. Dataset versioning and release cadence

The dataset is a published product, so it is versioned and released like one.

- **Schema version.** `v1` is the schema in this document. The version lives in `schema/` and in the contract published in `shared/`. A breaking schema change bumps the major version and follows section 18.
- **Data version.** Every published snapshot has a timestamp and an id (for example `2026-09-17`). The site displays the snapshot date as the `Laatst bijgewerkt` stamp.
- **Contract served to clients.** The JSON the web app and the Swift app read is served under `/data/v1/...` and `/api/v1/...`. A new schema ships as `/data/v2/...` alongside `v1` until clients migrate, so a shipped app never breaks on a data change.
- **Deprecation.** A deprecated schema version gets a stated end date, is announced in the changelog, and is removed only after both clients have migrated. See `06-build-plan.md` section 9.5.
- **Release cadence.** Data refreshes nightly. Schema releases are rare and deliberate, not a side effect of a data refresh.
- **Changelog.** Every schema release and every data-model change is recorded with a reason and a date. The public correction log in `09-content-and-ai-policy.md` section 8 is separate: that one records factual corrections, this one records model changes.
- **Compatibility check.** CI verifies that the published JSON still validates against the current contract before any deploy, so a silent shape change fails the build rather than a client.

## 21. Election

One zetelverdeling for one elected body on one election date. Drives the seat chart history and the party pages. Sources are the Kiesraad for the Tweede Kamer, Eerste Kamer, Provinciale Staten and Europees Parlement; older results may cite `verkiezingsuitslagen.nl` (Kiesraad-backed) at `medium` confidence.

```json
{
  "id": "election:tk-2025-10-29",
  "body": "org:tweede-kamer",
  "date": "2025-10-29",
  "kind": "vervroegd",
  "seatsTotal": 150,
  "turnout": 0.78,
  "validVotes": null,
  "seats": [{ "party": "PVV", "seats": 26, "votes": null, "share": null }],
  "notes": null,
  "source": { "source": "src:kiesraad-tk-2025", "retrieved": "2026-09-19", "confidence": "high" }
}
```

- `seats` sums to `seatsTotal`; the validator enforces it.
- `party` uses the keys of `web/lib/parties.ts`, the same keys as `membership.fractie`. A historical party that no longer exists is added to that table with its sourced colour, or with no colour and a note.
- Lijstverbindingen and restzetels are not modelled; the seat count is the final allocation as published.
- Values in the example are placeholders for shape only.

## 22. Coalition

One kabinet: the parties that formed it, when it was sworn in, when it ended, and the agreement it rests on. Drives the coalition outline and the majority statement on the seat chart.

```json
{
  "id": "coalition:kabinet-schoof",
  "government": "org:regering",
  "name": "Kabinet-Schoof",
  "parties": ["PVV", "VVD", "NSC", "BBB"],
  "start": "2024-07-02",
  "end": null,
  "demissionairSince": null,
  "primeMinister": "person:dick-schoof",
  "agreement": "src:hoofdlijnenakkoord-2024",
  "kind": "meerderheid",
  "notes": null,
  "source": { "source": "src:rijksoverheid-kabinet-schoof", "retrieved": "2026-09-19", "confidence": "high" }
}
```

- `end: null` means sitting. A demissionair kabinet stays open with `demissionairSince` set; `end` is the day the successor is sworn in.
- A party leaving the coalition mid-term closes the record and opens a new one (a rompkabinet) with `kind: "rompkabinet"`, so the chart shows the majority as it was on each date.
- Values in the example are placeholders for shape only.

## 23. ChamberPlan

The floor plan of a chamber's plenary hall as the chamber publishes it: where every seat is, which fractie or member sits in it, and where the chair and the kabinet sit. Drives the hall in Connections (ADR 0018, amendment 3). File `data/chamber-plans.json`, schema `schema/v1/chamber-plan.schema.json`.

```json
{
  "id": "plan:eerste-kamer-2026-09-25",
  "organization": "org:eerste-kamer",
  "asOf": "2026-09-25",
  "coordinates": "grid",
  "seatBasis": "person",
  "seats": [{ "x": 0, "y": 0, "fractie": "SP", "person": "person:example", "block": "left" }],
  "places": { "chair": { "x": 4, "y": 9 }, "cabinet": [{ "from": { "x": 3, "y": -1 }, "to": { "x": 5, "y": -1 } }] },
  "notes": null,
  "source": { "source": "src:ek-wie-zit-waar", "retrieved": "2026-09-25", "confidence": "high" }
}
```

- `coordinates`: `pdf-points` are the centres of the drawn shapes in points of the source page (origin top left, y down); `grid` is the row and column of the source's markup. Neither is a seat number, so `memberships.seatNumber` stays null.
- `seatBasis`: `person` when the source names the member in each seat, `fractie` when it only shows which fractie sits where. `fractie` uses the membership's fractie name.
- `places.cabinet` is the kabinet's bench as centre lines. Who sits where on it is not published; the app draws it schematically.
- `asOf` is the edition date of a published plan, or the retrieval date of a live page. The app draws the newest plan per chamber and falls back to fractie blocks when it no longer matches the sitting members; the validator checks only references, because memberships change daily.
- Values in the example are placeholders for shape only.
