# Attribution

What you must credit when you reuse Staatsgraaf, and where each source's terms are. Generated from `data/sources.json` and `data/media.json` by `pipelines/licenses.mjs` (`bun run merge`). Do not edit by hand.

## The data licence

The dataset (the compiled data, the descriptions and the summaries) is licensed CC BY 4.0, see `LICENSE-DATA`. The code is CC BY-NC-SA 4.0, see `LICENSE`. Facts are not copyrightable: the data licence covers our selection, structure and own wording. On reuse you must:

1. credit the project as "Staatsgraaf" and link to this repository;
2. keep the source, the retrieval date and the licence next to the facts they belong to, as `data/sources.json` records them; and
3. state the licence and link to it, and keep the independence statement in `LICENSE-DATA`.

The code has its own licence, CC BY-NC-SA 4.0 (`CC-BY-NC-SA-4.0`), see `LICENSE`. To reuse the code, credit "Staatsgraaf (https://github.com/techneissa/staatsgraaf), CC BY-NC-SA 4.0", use it for noncommercial purposes only, and share your adaptations under the same licence. The data licence above does not change that.

Photos are not under the dataset licence. Each one keeps the licence its author gave it, see Portraits below. The per-source licence decisions, with evidence and retrieval dates, are in `research/O-licenses.md`.

## Source families

Where facts come from, grouped by publisher and licence. 6,514 sources are recorded in all: 2,849 in the table, 3,330 news links and 335 with no established licence (each below).

| Publisher or website | What we use it for | Licence | Terms | Sources |
| --- | --- | --- | --- | ---: |
| Tweede Kamer open data | Members, factions, committees, activities, official photos | CC0 1.0 | <https://data.overheid.nl/dataset/open-data-portaal-van-de-tweede-kamer-der-staten-generaal> | 620 |
| Wikidata | Identifiers, birth dates, links to photos | CC0 1.0 | <https://www.wikidata.org/wiki/Wikidata:Licensing> | 688 |
| Rijksoverheid and other central government sites | Offices, office holders, organisation structure | CC0 1.0 | <https://www.rijksoverheid.nl/service/copyright> | 279 |
| Laws and official gazettes (overheid.nl) | Legal bases, appointments, decrees | CC0 1.0 | <https://www.overheid.nl/help/officiele-bekendmakingen/bestanden-en-hergebruik> | 201 |
| Register van Overheidsorganisaties (KOOP) | Public bodies and their managers | CC0 1.0 | <https://data.overheid.nl/dataset/overheidsorganisaties-xml> | 153 |
| Eerste Kamer | Members, committees (facts only, no photos) | CC BY 4.0 (recorded as such; custom reuse right: source URL, extraction date and annotation) | <https://www.eerstekamer.nl/begrip/colofon> | 133 |
| Rechtspraak | Courts and judges (facts only, no photos) | CC BY 4.0 (recorded as such; custom attribution right: name the source, imply no endorsement) | <https://www.rechtspraak.nl/colofon> | 21 |
| Kiesraad and verkiezingsuitslagen.nl | Election results and dates | CC0 1.0 | <https://www.kiesraad.nl/service/copyright> | 29 |
| Centraal Bureau voor de Statistiek | Statistics | CC BY 4.0 | <https://www.cbs.nl/nl-nl/over-ons/website/copyright> | 24 |
| CPB | Publications and figures | CC BY 3.0 NL | <https://www.cpb.nl/copyright> | 4 |
| PBL | Publications and figures | CC BY 4.0 | <https://www.pbl.nl/over-het-pbl/copyright> | 3 |
| Wikipedia | Lists of mayors and dijkgraven (facts) | CC BY-SA 4.0 | <https://nl.wikipedia.org/wiki/Wikipedia:Auteursrechten> | 228 |
| Wikimedia Commons | Photo file pages (the source of each portrait) | Per file (CC0, CC BY, CC BY-SA, public domain) | <https://commons.wikimedia.org/wiki/Commons:Licensing> | 388 |
| Parlement.com and overheid.nl site pages | Cross-checks (facts only) | all rights reserved | <https://www.parlement.com/over-deze-site> | 76 |
| Other public bodies | Offices and office holders from the body's own site | CC0 1.0 | the site's own copyright page; see research/O-licenses.md | 2 |

Where a licence asks for a credit (CC BY and CC BY-SA, the Eerste Kamer, Rechtspraak), the credit is the publisher's name plus the source URL and retrieval date from `data/sources.json`. Where a source is licensed CC0, no credit is owed, but the dataset still names it. Do not imply that any publisher endorses Staatsgraaf.

## Portraits

Photos come from Wikimedia Commons and the Tweede Kamer open data, never from a source with no stated licence. The author, licence and source page of each photo are shown in the (i) next to the photo on its person page, and stored with the photo in `data/media.json` (credit, author, licence, source) and `data/sources.json` (source page, retrieval date). 457 portraits are on record: 182 CC0 1.0, 126 CC BY (4 marked only "Attribution" on Commons), 139 CC BY-SA, 6 public domain, 1 Copyrighted free use, 3 European Parliament.

The site shows scaled-down and cropped copies, and says so in the credit. For CC BY-SA photos the copy is shared under the same licence. The decision and the licence texts it rests on are in `docs/adr/0025-photo-credits.md`.

## News

3,330 sources are news articles or news-outlet pages. Their publishers keep all rights, so Staatsgraaf links to them and shows only the headline and the link, never the article text or its images. No credit is owed beyond naming the outlet, which every link does.

## Sources with no established licence

335 sources have no established licence (`unknown` or empty in `data/sources.json`). They supply facts only, never text or images. The full list, with each endpoint, is in `data/sources.json`.

## Inspiration

Staatsgraaf was inspired by the Gov Graph (https://graph.civlab.org/us) by CivLab, which maps the United States federal government. We thank CivLab for the idea. Staatsgraaf is an independent project: it is not affiliated with or endorsed by CivLab, and it uses none of CivLab's code, data, text or images. The Dutch data, the layout and the wording are our own, from the sources listed in this file.

## Where the detail lives

- `data/sources.json`: every source, with its URL, publisher, licence and retrieval date.
- `data/media.json`: every photo, with its credit, author, licence and source.
- `research/O-licenses.md`: the licence determination per publisher, with the terms page and the date it was read.
