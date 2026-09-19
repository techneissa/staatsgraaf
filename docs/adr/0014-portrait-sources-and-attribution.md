# ADR 0014: Portrait sources and the Attribution licence

Date: 19-09-2026
Status: accepted

## Context

330 of 880 people had a portrait. The owner asked for portraits of every member of parliament, using official or Wikipedia images where available, and a source that is "somewhat official and reliable". The portraits pipeline (pipelines/portraits.mjs) resolved people through Wikidata and only accepted Commons files with a recognized SPDX-like licence; files that carry only the short licence name "Attribution" (the Commons label when the CC BY version is not pinned down, for example Rob Jetten's P18) were recorded as a gap, as were people without a P18 image.

## Decision

1. **Attribution files are accepted.** A Commons file whose only licence indication is the short name "Attribution" is free to use with attribution; the media record keeps the licence verbatim as `Attribution`, the Commons file page is the source, and the credit line names the author. This is recorded rather than guessed at a SPDX value, because the version is genuinely unknown.
2. **Official portraits come first in the fallback order.** For Eerste Kamer members the member's own page on eerstekamer.nl (CC BY 4.0, publisher Eerste Kamer der Staten-Generaal) supplies the portrait directly from the page's og:image. This is an official source and is applied with confidence high; the source record `src:portret-officieel-<slug>` points at the member page. Order of preference per person: Wikidata P18 file, official website portrait, free page image of the Dutch Wikipedia article, free page image of the English Wikipedia article.
3. **Full names come from the official pages, not from guessing.** EK member pages give the full name in their introduction sentence; where a person record only carried initials ("mr. H.W. Vogels"), the extracted full name ("Rian Vogels") is used as an extra search form for Wikidata resolution inside the run, via a hints file, without changing the Dutch names in the dataset.
4. **Nobody invents an image.** People without any usable source (no P18, no official portrait, no free page image) stay portrait-less with a named gap in the QA report (research/qa/portraits-19-09-2026.md); no alternative is substituted.

## Consequences

Portraits rise from 330 to 401 of 880 people (71 added this pass: 53 official EK portraits, 18 Commons files, of which 5 carry the Attribution licence). 60 current parliament members remain without a portrait: most sit in the Tweede Kamer or are new members without a free photograph anywhere; the named gaps stay in the report. The media licence vocabulary gains the literal value "Attribution" alongside the SPDX-like values. The Tweede Kamer site itself is not scraped: its photo licence is not stated on the pages, so it fails the "somewhat official and reliable" bar without further verification.
