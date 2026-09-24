# ADR 0014: Portrait sources and the Attribution licence

Date: 19-09-2026
Status: accepted, amended 25-09-2026 (Eerste Kamer portraits withdrawn, see amendment 1)

## Context

330 of 880 people had a portrait. The owner asked for portraits of every member of parliament, using official or Wikipedia images where available, and a source that is "somewhat official and reliable". The portraits pipeline (pipelines/portraits.mjs) resolved people through Wikidata and only accepted Commons files with a recognized SPDX-like licence; files that carry only the short licence name "Attribution" (the Commons label when the CC BY version is not pinned down, for example Rob Jetten's P18) were recorded as a gap, as were people without a P18 image.

## Decision

1. **Attribution files are accepted.** A Commons file whose only licence indication is the short name "Attribution" is free to use with attribution; the media record keeps the licence verbatim as `Attribution`, the Commons file page is the source, and the credit line names the author. This is recorded rather than guessed at a SPDX value, because the version is genuinely unknown.
2. **Official portraits come first in the fallback order.** For Eerste Kamer members the member's own page on eerstekamer.nl (CC BY 4.0, publisher Eerste Kamer der Staten-Generaal) supplies the portrait directly from the page's og:image. This is an official source and is applied with confidence high; the source record `src:portret-officieel-<slug>` points at the member page. Order of preference per person: Wikidata P18 file, official website portrait, free page image of the Dutch Wikipedia article, free page image of the English Wikipedia article.
3. **Full names come from the official pages, not from guessing.** EK member pages give the full name in their introduction sentence; where a person record only carried initials ("mr. H.W. Vogels"), the extracted full name ("Rian Vogels") is used as an extra search form for Wikidata resolution inside the run, via a hints file, without changing the Dutch names in the dataset.
4. **Nobody invents an image.** People without any usable source (no P18, no official portrait, no free page image) stay portrait-less with a named gap in the QA report (research/qa/portraits-19-09-2026.md); no alternative is substituted.

## Consequences

Portraits rise from 330 to 401 of 880 people (71 added this pass: 53 official EK portraits, 18 Commons files, of which 5 carry the Attribution licence). 60 current parliament members remain without a portrait: most sit in the Tweede Kamer or are new members without a free photograph anywhere; the named gaps stay in the report. The media licence vocabulary gains the literal value "Attribution" alongside the SPDX-like values. The Tweede Kamer site itself is not scraped: its photo licence is not stated on the pages, so it fails the "somewhat official and reliable" bar without further verification.

## Amendment 1: Eerste Kamer portraits withdrawn, Tweede Kamer Open Data added (25-09-2026)

A licence check on 24-09-2026 found that the Eerste Kamer colophon (https://www.eerstekamer.nl/begrip/colofon) requires permission to republish its images. Decision point 2 above assumed CC BY 4.0 for the member pages; that assumption was wrong. All 53 Eerste Kamer portraits are withdrawn, and the pipeline now withdraws them automatically. Those members fall back to a free Commons file where one exists, or to an initials placeholder with a named gap.

The Tweede Kamer Open Data portal publishes its data under CC0 1.0 unless stated otherwise (https://opendata.tweedekamer.nl/disclaimer, checked 24-09-2026). Its member photos are now the first choice for current Tweede Kamerleden, matched on current membership and full name, with birth dates compared where both sides have one. Rijksoverheid.nl reserves copyright on its photos of bewindspersonen (https://www.rijksoverheid.nl/service/copyright), so they are not used.

Result: 420 of 880 people have a portrait (149 Tweede Kamer Open Data, 271 Commons). 72 of them had no portrait before. The 460 remaining gaps are named per person in `research/qa/portraits-25-09-2026.md`. The licence pages as fetched are kept in `research/raw/portraits/licences/`.
