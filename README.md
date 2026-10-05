# Staatsgraaf

Staatsgraaf is a public map of the Dutch state. It shows which bodies exist, who sits in them, how they connect, and what changed recently. Every fact links to the official source it came from.

Live site: https://staatsgraaf.pages.dev (Dutch, with an English switch)

The idea comes from the CivLab Gov Graph for the United States (https://graph.civlab.org/us). Staatsgraaf does the same for the Netherlands: the Rijk, provinces, gemeenten, waterschappen, the courts, the two Kamers and the cabinet.

## What you can do on the site

- Browse the state as a wheel or a graph, and switch to a second view that shows hierarchy, the cabinet, the Tweede Kamer and Eerste Kamer seat charts, and how bodies relate.
- Open any person, organisation, position, party or topic. Each page lists who holds the office, since when, who held it before, and the source for each statement.
- Follow `Wijzigingen` for appointments, departures, vacancies and acting officials. Changes can be filtered by period, kind and day, and read per person.
- Read `Nieuws` from 14 Dutch and English outlets. By default you see only items that name a real person, body, position or topic from the dataset. A toggle shows the rest.
- Look through `Begroting`: the 2025 to 2027 budgets per ministry, with the sources.
- Search with typo tolerance. Press `/` or Cmd+K anywhere.

## Where the facts come from

Staatsgraaf has one rule. Every non-trivial fact carries a source URL, a retrieval date and a confidence value. Values are fetched, never written from memory. If a source cannot be reached or does not state a fact, the dataset records a named gap. A gap is allowed. An invented value is not.

| Subject | Source |
| --- | --- |
| Tweede Kamer members, fracties, seats, chairs | Tweede Kamer open data (CC0) |
| Eerste Kamer members and fractie boards | eerstekamer.nl pages |
| Ministers and staatssecretarissen | rijksoverheid.nl |
| Election dates | Kiesraad |
| Budgets | Begrotingsstaten from rijksfinancien.nl (CC0) |
| Portraits | Wikimedia Commons and Tweede Kamer open data, with licence and author recorded |
| News | RSS feeds of the outlets; only headline, link and time unless the feed allows more |

Language models may shorten and rephrase what a source says. They may not add facts. News is never a source for a fact about a person or an office. It can only prompt an early check of the official sources. The rules are in `docs/09-content-and-ai-policy.md`.

## The data

The merged dataset is in `data/` as JSON and is the single source of truth. The contract is `schema/v1/` (JSON Schema), and `bun run validate` checks the data against it, including references between records.

Snapshot of 05-10-2026:

| Records | Count |
| --- | --- |
| Organisations | 1,644 |
| Positions | 1,503 |
| People | 880 |
| Tenures | 1,716 |
| Memberships | 225 |
| Relations | 4,068 |
| Sources | 4,482 |
| Changes in the feed | 1,306 |
| News items | 1,245 |
| Budgets | 36 |
| Portraits | 457 |

Dates in the dataset are ISO 8601. Dates in documents are written dd-MM-YYYY.

## How the data stays current

`bun run live` refetches the official sources and applies what changed. It reads the Tweede Kamer by change cursor, checks the Eerste Kamer pages by hash, reads the cabinet list, and parses election dates.

Before it writes anything it checks that the result is consistent: 150 Tweede Kamer seats, 75 Eerste Kamer seats, no seat held twice, every member matched to a person, and fractie totals that add up. A large batch of changes passes only when an event explains it, such as a fractie merger or an election. Otherwise the run stops, writes nothing for that source and reports why. People and closed terms are never deleted. A term is closed with the official end date.

`bun run news` fetches the news feeds and links mentions to records in the dataset. The link step is a dictionary match against real records. A model never writes a link.

The scheduled workflows are in `.github/workflows/`. Decisions about sources and cadence are in `docs/adr/0006-live-official-sources.md` and `docs/adr/0024-live-data-automation.md`.

## Run it yourself

You need Bun 1.4.2 (pinned in `.bun-version`) and Node 20.9 or newer. Next.js runs on Node. The pipelines and tests run on Bun alone.

```sh
bun test pipelines web/lib   # tests
bun run validate             # schema and reference checks on data/
bun run live                 # refetch official sources and apply changes
bun run news                 # refetch news and relink mentions

cd web
bun install
bun run dev                  # http://localhost:3000
bun run build                # static export in web/out
```

`web/README.md` covers routes, design tokens and environment settings.

## Layout

| Path | Contents |
| --- | --- |
| `data/` | The merged dataset |
| `schema/v1/` | JSON Schema contract |
| `pipelines/` | Fetchers, merge, news, linker, change feed, and their tests |
| `research/` | Per-topic research output, merge log, licence determination |
| `web/` | The Next.js site, built as a static export |
| `shared/` | Design tokens and the cross-client contract |
| `scripts/` | Validator and link checker |
| `docs/` | Vision, data model, content policy, accessibility and security notes, decision records in `docs/adr/` |

## Known gaps

These are named, not filled with guesses.

- 841 of 1,503 positions have no recorded holder. Most are seat-bound roles such as raadslid, statenlid and wethouder. A position page says so instead of implying the seat is vacant.
- 52 of 880 people have neither a role nor a membership on record.
- 423 people have no portrait. A portrait is used only when its licence allows reuse and a second fact besides the name ties it to the person. The Eerste Kamer and rijksoverheid.nl do not allow reuse of their photos, and many mayors and board members have no freely licensed photo. The decision is in `docs/adr/0014-portrait-sources-and-attribution.md`.
- Party leaders have no official register. The dataset uses the Tweede Kamer fractievoorzitter as the sourced stand-in.
- Commissarissen van de Koning have no open register, so their entries are not refreshed automatically.
- The English interface translates labels and glosses. Page titles and meta descriptions stay Dutch, because the site is a static export with one HTML file per route.
- The mayor register and Kiesraad candidate lists are planned and not built.

The full list by phase is in `research/merge-log.md`.

## Licences

The code and the dataset have separate licences. See `LICENSE` for code and `LICENSE-DATA` for data. The data is CC BY 4.0: credit Staatsgraaf, keep each fact's source URL and retrieval date, and state the licence. `ATTRIBUTION.md` groups the sources by publisher and licence with a link to each one's terms and is generated from `data/sources.json`; the licence of every single source is in `data/sources.json`, and the author, licence and source of every photo are in `data/media.json` and in the (i) next to the photo. Where a source is all rights reserved, Staatsgraaf uses only the facts, the headline and the link, never the text or images.

To cite the data: "Staatsgraaf, dataset version v1, snapshot 05-10-2026. Source: {source-url}, retrieved {YYYY-MM-DD}. Available under CC BY 4.0."

## Corrections and contributing

A published fact is never edited silently. A correction keeps the old value, the new value, the date and the reason. Read `CONTRIBUTING.md` before you open a pull request, `SECURITY.md` to report a vulnerability, and `CODE_OF_CONDUCT.md` for how we work together.

## Independence

Staatsgraaf is an independent publication. It is not affiliated with or endorsed by the Dutch government or any government body. See `DISCLAIMER.md`. Check any fact against the official source before you rely on it.
