# Staatsgraaf

Staatsgraaf is a public map of the Dutch state. It lists the government bodies, the people who hold office in them, and how the bodies relate to each other, and it shows recent appointments and departures. Each fact links to the official source it came from.

Live site: https://staatsgraaf.pages.dev (Dutch, with an English switch)

The idea comes from the CivLab Gov Graph for the United States (https://graph.civlab.org/us). Staatsgraaf applies the idea to the Netherlands: the Rijk, provinces, gemeenten, waterschappen, the courts, the two Kamers and the cabinet.

## What you can do on the site

- Browse the state as a wheel or a graph, and switch to a second view that shows hierarchy, the cabinet, the Tweede Kamer and Eerste Kamer seat charts, and how bodies relate.
- Open any person, organisation, position, party or topic. Each page lists who holds the office, since when, who held it before, and the source for each statement.
- Follow `Wijzigingen` for appointments, departures, vacancies and acting officials. Changes can be filtered by period, kind and day, and read per person.
- Read `Nieuws` from about 20 Dutch and English outlets. By default you see only items that name a real person, body, position or topic from the dataset. A toggle shows the rest.
- Look through `Begroting`: the 2025 to 2027 budgets per ministry, with the sources.
- Search with typo tolerance. Press `/` or Cmd+K anywhere.

## Where the facts come from

Each non-trivial fact in the dataset has three things attached: the URL it came from, the date it was retrieved, and a confidence value. When a source cannot be reached or does not say something, the dataset marks it as unknown instead of guessing.

| Subject | Source |
| --- | --- |
| Tweede Kamer members, fracties, seats, chairs | Tweede Kamer open data (CC0) |
| Eerste Kamer members and fractie boards | eerstekamer.nl pages |
| Ministers and staatssecretarissen | rijksoverheid.nl |
| Election dates | Kiesraad |
| Budgets | Begrotingsstaten from rijksfinancien.nl (CC0) |
| Portraits | Wikimedia Commons and Tweede Kamer open data, with licence and author recorded |
| News | RSS feeds of the outlets; only headline, link and time unless the feed allows more |

Language models may shorten and rephrase what a source says, but they do not add facts. News is not a source for a fact about a person or an office. A news item can only make the pipeline check the official sources earlier. The rules are in `docs/09-content-and-ai-policy.md`.

## The data

The dataset is in `data/` as JSON. The JSON Schema in `schema/v1/` describes it, and `bun run validate` checks the data against that schema, including references between records. `data/meta.json` holds the dataset version and the time of the last build.

The data refreshes automatically several times a day, so the counts change. Roughly:

- 1,600 organisations
- 1,500 positions
- 900 people
- 1,800 tenures (one person in one position, with start and end)
- 225 memberships
- 4,000 relations between records
- 8,400 sources
- 1,300 entries in the change feed
- 4,700 news items
- 36 budgets (2025 to 2027)
- 450 portraits

Dates in the dataset are ISO 8601. Dates in documents are written dd-MM-YYYY.

## How the data stays current

`bun run live` refetches the official sources and applies what changed. It reads the Tweede Kamer by change cursor, checks the Eerste Kamer pages by hash, reads the cabinet list, reads the registers for provinces, gemeenten and waterschappen, and parses election dates.

Before it writes anything it checks that the result makes sense: 150 Tweede Kamer seats, 75 Eerste Kamer seats, no seat held twice, every member matched to a person, and fractie totals that add up. A large batch of changes goes through only when an event explains it, such as a fractie merger or an election. Otherwise the run stops, writes nothing for that source and reports why. The pipeline never deletes people or ended terms. It ends a term with the official end date.

`bun run news` fetches the news feeds and links mentions to records in the dataset. The link step matches names against the records in the dataset. A model does not write links.

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
| `research/` | Per-topic research output, merge log, licence determination. The local fetch cache `research/raw/` is not published, except the portrait licence evidence |
| `web/` | The Next.js site, built as a static export |
| `shared/` | Design tokens and the cross-client contract |
| `scripts/` | Validator and link checker |
| `docs/` | Vision, data model, content policy, accessibility and security notes, decision records in `docs/adr/` |

## Known gaps

The dataset does not have everything. Where it has no value, it says so.

- Some positions have no recorded holder. Most are seat-bound roles such as raadslid, statenlid and wethouder. The position page says so and does not imply that the seat is vacant.
- Some people have no role or membership on record.
- Some people have no portrait. The site shows a portrait only when its licence allows reuse and the photo can be matched to the person by more than a name. The Eerste Kamer and rijksoverheid.nl do not allow reuse of their photos, and many mayors and board members have no freely licensed photo. The reasoning is in [ADR 0014](docs/adr/0014-portrait-sources-and-attribution.md).
- Party leaders have no official register. The dataset uses the Tweede Kamer fractievoorzitter instead.
- Candidate lists are not in the dataset.
- The English interface translates labels and glosses. Page titles and meta descriptions stay Dutch, because the site is a static export with one HTML file per route.

## Licences

The code and the data have separate licences.

- Code: CC BY-NC-SA 4.0 (Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International, SPDX `CC-BY-NC-SA-4.0`). You may share and adapt it for noncommercial purposes. Credit "Staatsgraaf (https://github.com/techneissa/staatsgraaf), CC BY-NC-SA 4.0", say if you changed it, and share your adaptations under the same licence. Commercial use is not allowed. The code is source-available, not open source in the OSI sense, and this is not legal advice. See `LICENSE` and `docs/adr/0001-licenses.md`.
- Data: CC BY 4.0. Credit Staatsgraaf, keep each fact's source URL and retrieval date, and state the licence. See `LICENSE-DATA`.

`ATTRIBUTION.md` groups the sources by publisher and licence, with a link to each one's terms. The licence of every single source is in `data/sources.json`, and the author, licence and source of every photo are in `data/media.json` and in the (i) next to the photo. Where a source is all rights reserved, Staatsgraaf uses only the facts, the headline and the link, never the text or images.

To cite the data: "Staatsgraaf, dataset version {version}, retrieved {date you downloaded it}. Source: {source-url}, retrieved {YYYY-MM-DD}. Available under CC BY 4.0." The version is `datasetVersion` in `data/meta.json`. `YYYY-MM-DD` is the retrieval date stored with the fact.

## Corrections

When a published fact is corrected, `CHANGELOG.md` records the old value, the new value, the date and the reason. To report a wrong fact or a missing source, open an issue. Pull requests and other contributions are not accepted (`CONTRIBUTING.md`). Security reports go through `SECURITY.md`.

## Inspiration

Staatsgraaf was inspired by the Gov Graph (https://graph.civlab.org/us) by CivLab, which maps the United States federal government. We thank CivLab for the idea. Staatsgraaf is an independent project: it is not affiliated with or endorsed by CivLab, and it uses none of CivLab's code, data, text or images. The Dutch data, the layout and the wording are our own, from the sources listed in [ATTRIBUTION.md](ATTRIBUTION.md).

## Independence

Staatsgraaf is an independent publication. It is not affiliated with or endorsed by the Dutch government or any government body. See `DISCLAIMER.md`. Check any fact against the official source before you rely on it.
