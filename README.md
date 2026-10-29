# Staatsgraaf

Staatsgraaf is a public map of the Dutch state. It lists the government bodies, the people who hold office in them, and how the bodies relate to each other, and it shows recent appointments and departures. Each fact links to the official source it came from.

I made Staatsgraaf to help myself understand how the Dutch government fits together.

> [!IMPORTANT]
> Staatsgraaf is an independent project. It is not run by, connected to, or endorsed by the Dutch government or any government body. See [DISCLAIMER.md](DISCLAIMER.md).

Live site: https://staatsgraaf.pages.dev (in Dutch & English)

The idea comes from the CivLab Gov Graph for the United States (https://graph.civlab.org/us). Staatsgraaf applies the idea to the Netherlands: the Rijk, provinces, gemeenten, waterschappen, the courts, the two Kamers and the cabinet.

## What you can do on the site

- Browse the state as a wheel or a graph, and switch to a second view that shows hierarchy, the cabinet, the Tweede Kamer and Eerste Kamer seat charts, and how bodies relate.
- Open any person, organisation, position, party or topic. Each page lists who holds the office, since when, who held it before, and the source for each statement.
- Follow `Wijzigingen` for appointments, departures, vacancies and acting officials. Changes can be filtered by period, kind and day, and read per person.
- Read `Nieuws` from Dutch and English outlets. By default you see only items that name a real person, body, position or topic from the dataset. A toggle shows the rest.
- Look through `Begroting`: the 2025 to 2027 budgets per ministry, with the sources.
- Search with typo tolerance. Press `/` or Cmd+K anywhere.

## Where the facts come from

Each fact in the dataset carries the URL of its source and the date it was retrieved. When a source cannot be reached or does not say something, the dataset marks it as unknown instead of guessing.

| Subject | Source |
| --- | --- |
| Tweede Kamer members, fracties, seats, chairs | Tweede Kamer open data (CC0) |
| Eerste Kamer members and fractie boards | eerstekamer.nl pages |
| Ministers and staatssecretarissen | rijksoverheid.nl |
| Election dates | Kiesraad |
| Budgets | Begrotingsstaten from rijksfinancien.nl (CC0) |
| Portraits | Wikimedia Commons and Tweede Kamer open data, with licence and author recorded |
| News | RSS feeds of the outlets; only headline, link and time unless the feed allows more |

Language models may shorten and rephrase what a source says, but they do not add facts. News is not a source for a fact about a person or an office. A news item can only make the pipeline check the official sources earlier.

## The data

JSON files live in [`data/`](data/). [`schema/v1/`](schema/v1/) is the contract; `bun run validate` checks the files against it, including references between records. [`data/meta.json`](data/meta.json) has the dataset version and the time of the last build.

The data refreshes automatically several times a day, so the counts change. Roughly:

| Kind | About |
| --- | --- |
| Organisations | 1,600 |
| Positions | 1,500 |
| People | 900 |
| Tenures (one person in one position, with start and end) | 1,800 |
| Memberships | 225 |
| Relations between records | 4,000 |
| Sources | 8,400 |
| Change-feed entries | 1,300 |
| News items | 4,700 |
| Budgets (2025 to 2027) | 36 |
| Portraits | 450 |

## Run it yourself

You need Bun 1.4.2 (pinned in [`.bun-version`](.bun-version)) and Node 20.9 or newer. Next.js runs on Node. The pipelines and tests run on Bun alone.

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

[web/README.md](web/README.md) covers routes, design tokens and environment settings.

## Layout

| Path | Contents |
| --- | --- |
| `data/` | The merged dataset |
| `schema/v1/` | JSON Schema contract |
| `pipelines/` | Fetchers, merge, news, linker, change feed, and their tests |
| `research/` | Live pipeline state and raw caches the refresh needs |
| `web/` | The Next.js site, built as a static export |
| `shared/` | Design tokens and the cross-client contract |
| `scripts/` | Validator and link checker |

## Known gaps

The dataset does not have everything. Where it has no value, it says so.

- Some positions have no recorded holder. Most are seat-bound roles such as raadslid, statenlid and wethouder. The position page says so and does not imply that the seat is vacant.
- Some people have no role or membership on record.
- Some people have no portrait. The site shows a portrait only when its licence allows reuse and the photo can be matched to the person by more than a name. The Eerste Kamer and rijksoverheid.nl do not allow reuse of their photos, and many mayors and board members have no freely licensed photo.
- Party leaders have no official register. The dataset uses the Tweede Kamer fractievoorzitter instead.
- Candidate lists are not in the dataset.
- The English interface translates labels and glosses. Page titles and meta descriptions stay Dutch, because the site is a static export with one HTML file per route.

## Corrections

When a published fact is corrected, [CHANGELOG.md](CHANGELOG.md) records the old value, the new value, the date and the reason. To report a wrong fact or a missing source, open an issue. This project does not accept pull requests or other contributions.

## Inspiration

Staatsgraaf was inspired by the Gov Graph (https://graph.civlab.org/us) by CivLab, which maps the United States federal government. We thank CivLab for the idea. Staatsgraaf is an independent project: it is not affiliated with or endorsed by CivLab, and it uses none of CivLab's code, data, text or images. The Dutch data, the layout and the wording are our own, from the sources listed in [ATTRIBUTION.md](ATTRIBUTION.md).

## Independence

Staatsgraaf is an independent publication. It is not affiliated with or endorsed by the Dutch government or any government body. See [DISCLAIMER.md](DISCLAIMER.md). Check any fact against the official source before you rely on it.

## Licences

Code and data use different licences.

**Code** is [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) ([LICENSE](LICENSE)). Noncommercial share and adapt only. Credit as below, say if you changed it, and share adaptations under the same licence. The code is source-available, not open source in the OSI sense. This is not legal advice.

```
Staatsgraaf (https://github.com/techneissa/staatsgraaf), CC BY-NC-SA 4.0
```

**Data** is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ([LICENSE-DATA](LICENSE-DATA)). Credit Staatsgraaf, keep each fact's source URL and retrieval date, and state the licence.

```
Staatsgraaf, dataset version {version}, retrieved {date you downloaded it}.
Source: {source-url}, retrieved {YYYY-MM-DD}.
Available under CC BY 4.0.
```

`{version}` is `datasetVersion` in [data/meta.json](data/meta.json). `{YYYY-MM-DD}` is the retrieval date stored with the fact.

Source terms by publisher: [ATTRIBUTION.md](ATTRIBUTION.md).

Per-source licence: [data/sources.json](data/sources.json).

Per-photo author, licence and source: [data/media.json](data/media.json) and the (i) next to the photo.

Where a source is all rights reserved, Staatsgraaf uses only the facts, the headline and the link, never the text or image.
