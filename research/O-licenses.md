# Workstream O: legal, license, and privacy review

This file is the per-source license determination, the reuse rules, the personal-data boundary, the disclaimer, and the provenance and correction language for the NL Overheid Graph. It informs `docs/adr/0001-licenses.md`. It writes no LICENSE file; the orchestrator owns root files.

Every license claim below cites the terms page or license URL and a retrieval date. Fetches were done 18-09-2026 with a browser-like user agent, one request per URL, no cookies. Blocks were respected, never evaded. Where a determination could not be made, it is a named gap with the endpoint.

The one rule that governs everything here: we republish facts and our own prose, not source prose. Facts are not copyrightable; a source's expression and its images are. Our dataset contains entity names, dates, titles, codes, and our own summaries, so in most cases we are outside the source's copyright, and the source license mainly governs attribution and any images we add.

## 1. Determination table

Status codes:

- **Open** means free reuse, with the stated attribution.
- **Attribution** means reuse allowed only with the stated credit.
- **Restricted** means facts may be used but the source's prose or images may not be republished.
- **Gap** means no determination could be made; endpoint named.

### 1.1 Legal and legislative

| Source | License | Reuse rule | Restriction | Evidence |
| --- | --- | --- | --- | --- |
| wetten.overheid.nl (consolidated law texts) | No copyright, Art. 11 Auteurswet | Open: reuse the legal text freely | Privacy-sensitive publications use `/noindex/` and are made unfindable; do not republish them or re-index them | https://www.overheid.nl/help/officiele-bekendmakingen/bestanden-en-hergebruik (18-09-2026), citing Auteurswet art. 11 https://wetten.overheid.nl/BWBR0001886 |
| repository.overheid.nl and its SRU interface | CC-0 1.0 (dataset registration) plus Art. 11 for the legal texts | Open | Same privacy regime as officielebekendmakingen; the bulk API is preferred over scraping | https://data.overheid.nl/dataset/officielebekendmakingen (18-09-2026); SRU handleiding via https://www.overheid.nl/informatie-hergebruiken (18-09-2026) |
| officielebekendmakingen.nl (Staatsblad, Staatscourant, Tractatenblad, Staatsalmanak) | Art. 11 Auteurswet; the SRU dataset is registered CC-0 1.0 | Open: laws, decisions, and ordinances are free to reuse unless the publication says otherwise | Privacy-sensitive content is published temporarily and carries `/noindex/`; reuse must take similar measures. Prefer the API over scraping. A publication can carry a stated exception | https://www.overheid.nl/help/officiele-bekendmakingen/bestanden-en-hergebruik (18-09-2026) |

### 1.2 Parliament

| Source | License | Reuse rule | Restriction | Evidence |
| --- | --- | --- | --- | --- |
| Tweede Kamer OData (gegevensmagazijn.tweedekamer.nl) | CC-0 1.0 | Open | None stated beyond the dataset terms | https://data.overheid.nl/dataset/open-data-portaal-van-de-tweede-kamer-der-staten-generaal (18-09-2026) |
| tweedekamer.nl website pages | Not separately verified | Facts only | Treat as restricted until verified; do not copy prose or images | Named gap, endpoint https://www.tweedekamer.nl |
| Eerste Kamer (eerstekamer.nl) | Custom non-exclusive reuse right, not CC0 | Attribution: reuse and commercial republication allowed only if the authentic source URL, the extraction date, and an annotation are given | Images are rights of third parties and may not be republished without permission. The exact annotation wording was not captured in the fetched HTML | https://www.eerstekamer.nl/begrip/colofon (18-09-2026) |
| Kiesraad (kiesraad.nl) | CC0 1.0 for text | Open | Images almost never reusable | https://www.kiesraad.nl/service/copyright (18-09-2026) |
| verkiezingsuitslagen.nl (Kiesraad databank) | CC0 for the site content | Open; crediting Kiesraad is appreciated, not required | Parts stated as copyrighted are excluded | https://www.verkiezingsuitslagen.nl/Info/Copyright (18-09-2026) |

### 1.3 Executive, oversight, and judiciary

| Source | License | Reuse rule | Restriction | Evidence |
| --- | --- | --- | --- | --- |
| rijksoverheid.nl, regering.nl, government.nl | CC0 1.0 for text | Open: use text without permission | Images almost never reusable; a stated copyright on a text excludes it. Do not imply the Rijksoverheid endorses our work | https://www.rijksoverheid.nl/service/copyright (18-09-2026); open data terms https://www.rijksoverheid.nl/opendata/voorwaarden (18-09-2026) |
| koninklijkhuis.nl | CC0 1.0 for text | Open | Images almost never reusable | https://www.koninklijkhuis.nl/service/copyright (18-09-2026) |
| rijksdienstcn.com | CC0 1.0 for text | Open | Images almost never reusable | https://www.rijksdienstcn.com/service/copyright (18-09-2026) |
| rijksfinancien.nl | CC0 for content | Open; attribution not required | Photos excluded from CC0 unless stated | https://www.rijksfinancien.nl/copyright (18-09-2026) |
| defensie.nl | CC BY-SA 4.0 | Attribution and share-alike: credit "Ministerie van Defensie", state changes, and license derivatives under the same terms | Text or image with a stated copyright is excluded. Recognisable persons trigger AVG and require consent | https://www.defensie.nl/service/copyright (18-09-2026) |
| rechtspraak.nl and uitspraken.rechtspraak.nl | Custom attribution right | Attribution: reuse website information if the source is named and no endorsement is implied | Images, logos, and staff photos are copyrighted or under portretrecht. No rights can be derived from the content | https://www.rechtspraak.nl/colofon (18-09-2026) |
| om.nl, dji.nl, inspectie-jenv.nl, justitieleictorganisatie.nl, algemenebestuursdienst.nl, rekenkamer.nl, wrr.nl, raadopenbaarbestuur.nl, onderwijsraad.nl, gezondheidsraad.nl, raadrvs.nl, adviesraadinternationalevraagstukken.nl, adviesraadmigratie.nl, awti.nl, scp.nl | CC0 1.0 for text | Open | Images not reusable | The individual `/service/copyright` pages, checked 18-09-2026 (for example https://www.om.nl/service/copyright, https://www.rekenkamer.nl/service/copyright) |
| cpb.nl | Publications free to reuse; the page points to CC BY 3.0 NL | Attribution requested: name CPB as source and do not imply endorsement | Photos excluded. The site footer states "alle rechten voorbehouden", which conflicts with the copyright page; the copyright page governs reuse | https://www.cpb.nl/copyright (18-09-2026) |
| pbl.nl | CC BY 4.0 for publications and PBL-produced figures | Attribution: name PBL as source, do not imply endorsement | Photos excluded; publications issued by an external paid publisher are excluded | https://www.pbl.nl/over-het-pbl/copyright (18-09-2026) |
| raadvanstate.nl | Gap, 403 to automated fetch | Use the alternative: raadvanstate.nl content is also published via the repository SRU and officielebekendmakingen | Do not evade the block | Endpoint https://www.raadvanstate.nl; alternative https://repository.overheid.nl/sru |
| politie.nl | Gap, 403 to automated fetch | No determination | Do not evade the block | Endpoint https://www.politie.nl |
| nationaleombudsman.nl | Gap, no license or copyright page found | Facts only | Do not copy prose or images | Endpoint https://www.nationaleombudsman.nl |
| ser.nl, rli.nl, hogeraad.nl | Gap, no license or copyright page found | Facts only | Do not copy prose or images | Endpoints https://www.ser.nl, https://www.rli.nl, https://www.hogeraad.nl |
| universiteitleiden.nl | Gap, no open license found | Facts only; it is a university, not a government open-data source | Do not copy prose or images | Endpoint https://www.universiteitleiden.nl (used once in F for a staff page) |

### 1.4 Decentral

| Source | License | Reuse rule | Restriction | Evidence |
| --- | --- | --- | --- | --- |
| CBS open data (opendata.cbs.nl, OData API) | CC BY 4.0 by default | Attribution: name CBS as source; do not imply CBS endorses the derived work | Third-party photos, portrait rights, privacy rights, and parts marked as an exception are excluded | https://www.cbs.nl/nl-nl/over-ons/website/copyright (18-09-2026) |
| KOOP Register van Overheidsorganisaties (organisaties.overheid.nl, XML and CSV exports) | CC-0 1.0 | Open | The register contains personal data of mainly managerial officials; it is processed under KB 16 July 1859 and notified to the AP under m1368142. We ingest only persons with a modeled public function | https://data.overheid.nl/dataset/overheidsorganisaties-xml (18-09-2026); https://www.overheid.nl/help/overheidsorganisaties (18-09-2026) |
| overheid.nl (site prose and help pages) | No explicit site license found; the datasets it exposes are CC0 | Facts only; reuse the CC0 datasets rather than site prose | Do not copy site prose | https://www.overheid.nl/over-deze-site/colofon (18-09-2026); https://www.overheid.nl/informatie-hergebruiken (18-09-2026) |
| data.overheid.nl | The register itself; per-dataset licenses vary | Follow the license attached to each dataset; CC0, CC BY, CC BY-SA, publiek domein, unknown, or no open license | A dataset marked "licentie onbekend" or "geen open licentie" is not open | https://data.overheid.nl/licenties-voor-hergebruik (18-09-2026) |
| nl.wikipedia.org (used by workstream G for burgemeester and dijkgraaf lists) | CC BY-SA 4.0 (and GFDL) for text | Attribution and share-alike for any reused expression; the licences waive sui generis database rights, so individual facts may be reused freely | The compilation as a list may attract copyright; do not copy prose. Prefer re-sourcing the rows from the KBs | https://nl.wikipedia.org/wiki/Wikipedia:Auteursrechten (18-09-2026); Wikimedia ToU https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use (18-09-2026) |
| waarstaatjegemeente.nl, allecijfers.nl | Gap | Not used by A to N; check before use | Private or unreachable sources; no open license stated | Endpoints https://waarstaatjegemeente.nl, https://allecijfers.nl |
| openraadsinformatie.nl | Gap, named as a resume endpoint only | Not yet fetched by A to N | Check the license before ingesting seat-level memberships | Endpoint https://openraadsinformatie.nl |
| individual provincie, gemeente, waterschap sites (fryslan.frl, brabant.nl, limburg.nl, overijssel.nl, provincie.drenthe.nl, zeeland.nl, zuid-holland.nl, noord-holland.nl) | Mostly CC0 via the Rijksoverheid theme, not individually verified per site | Facts only until verified | Do not copy prose or images | Endpoints per the research G source table |

### 1.5 Media, news, and reference

| Source | License | Reuse rule | Restriction | Evidence |
| --- | --- | --- | --- | --- |
| DPG Media titles: AD, de Volkskrant, Trouw, Het Parool | All rights reserved | Facts only; store the headline and the deep link, and write our own one-sentence summary | No reproduction, disclosure, or distribution without written permission; robots and robots.txt must be respected; no images | https://www.dpgmediagroup.com/en-BE/terms-of-use (18-09-2026) |
| NRC (Mediahuis) | All rights reserved | Facts only; headline and deep link | No reproduction; no images | https://adverteren.nrc.nl/onze-media (18-09-2026) |
| Binnenlands Bestuur (Sijthoff Media) | All rights reserved | Facts only; headline and deep link | Reproduction or disclosure without written permission is not allowed; all intellectual property stays with Binnenlands Bestuur | https://www.binnenlandsbestuur.nl/algemene-voorwaarden-privacy-statement (18-09-2026) |
| FD (Mediahuis) | All rights reserved | Facts only; headline and deep link | No reproduction; no images | https://fd.nl/copyright (18-09-2026) |
| NOS, NU.nl, RTL Nieuws, BNR, other publishers | Same class: all rights reserved | Facts only; headline and deep link; at most a short quotation with attribution | Do not reproduce article text or images; BNR blocks automated fetch | Named gaps, endpoints https://over.nos.nl, https://www.nu.nl, https://www.rtlnieuws.nl, https://www.bnr.nl |
| regional broadcaster rtvdrenthe.nl (used once in E) | All rights reserved | Facts only | Do not reproduce text or images | Endpoint https://www.rtvdrenthe.nl |
| Wikimedia Commons (portraits) | Per-file license: CC0, CC BY, CC BY-SA, or public domain | Follow the license on the file description page; record the license and the author credit per file | No fair-use media. Attribution and sometimes share-alike are required. A portrait with no recorded license does not ship | https://commons.wikimedia.org/wiki/Commons:Licensing (18-09-2026); https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia (18-09-2026) |
| official government portraits (Rijksoverheid and organization press pages) | CC0 for text; images almost never reusable | Use only where the image itself states a license and a photographer | Do not assume press images are reusable | https://www.rijksoverheid.nl/service/copyright (18-09-2026); E portrait note in research/E-rechterlijke-macht.md |
| parlement.com | All rights reserved | Secondary verification only; never copy prose or images | Reuse, in whole or in part, requires contacting the editors | https://www.parlement.com/over-deze-site (18-09-2026) |
| CivLab reference (graph.civlab.org, sfgov.civlab.org, xxix.co, sanctuary.computer, civlab.substack.com) | All rights reserved; design reference only | Read to understand the information architecture and design; do not republish their prose, code, data, or images | The Substack feed carries full post text; do not copy it. This is a design source, not a data source | research/M-design.md; endpoints per that file |

## 2. Disclaimer text

Place this on every page footer, on the About or Method page, and in the dataset download. It is the same statement in both languages.

### 2.1 Nederlands

> NL Overheid Graph is een onafhankelijk, openbaar naslagwerk over de Nederlandse overheid. Dit project is niet verbonden aan, en wordt niet gesteund of gefinancierd door, de Nederlandse overheid of enige officiële instantie. Alle informatie is afkomstig uit openbare bronnen die per feit worden vermeld. Aan de weergave kunnen geen rechten worden ontleend. Bij twijfel raadpleegt u altijd de officiële bron. Klopt er iets niet? Meld het via het correctieformulier; elke correctie wordt met datum en reden in het openbare changelog vastgelegd.

### 2.2 English

> NL Overheid Graph is an independent, public reference work about the Dutch government. This project is not affiliated with, and is not endorsed or funded by, the Dutch government or any official body. All information comes from public sources, cited per fact. No rights can be derived from this presentation. When in doubt, always consult the official source. Found an error? Report it through the correction form; every correction is recorded with its date and reason in the public changelog.

The disclaimer is separate from the attribution that specific source licenses require. Attribution always sits next to the data it belongs to.

## 3. Provenance and citation language

### 3.1 On the page

Every entity, position, person, and change carries:

- A source link to the exact URL that states the fact.
- A retrieval date in ISO 8601.
- A confidence value.
- A dataset version and snapshot date in the page metadata, so a cached page is not mistaken for current.

### 3.2 Suggested citation

Use this shape in the "cite this" note and in the dataset download:

- Dutch: "NL Overheid Graph, datasetversie {version}, peildatum {YYYY-MM-DD}. Bron: {bron-url}, geraadpleegd {YYYY-MM-DD}. Beschikbaar onder {licentie}."
- English: "NL Overheid Graph, dataset version {version}, snapshot {YYYY-MM-DD}. Source: {source-url}, retrieved {YYYY-MM-DD}. Available under {license}."

### 3.3 Required per-source attribution in the dataset

- CBS: "Bron: Centraal Bureau voor de Statistiek (CBS), {table}, geraadpleegd {date}." CBS data are CC BY 4.0, so this credit is mandatory.
- CPB: "Bron: CPB, {publication}, geraadpleegd {date}." CPB requests the credit and points to CC BY 3.0 NL.
- PBL: "Bron: PBL, {publication}, geraadpleegd {date}." PBL uses CC BY 4.0.
- Eerste Kamer: "Bron: Eerste Kamer der Staten-Generaal, {url}, geraadpleegd {date}." The Eerste Kamer license also requires the extraction date and an annotation; the exact annotation wording is a gap (see section 6).
- Defensie: "Bron: Ministerie van Defensie, {url}, geraadpleegd {date}, gewijzigd weergegeven." CC BY-SA 4.0 requires the credit, a statement of changes, and share-alike on derivatives.
- Wikipedia-derived rows (burgemeester and dijkgraaf lists): "Bron: Wikipedia, {article-url}, geraadpleegd {date}, CC BY-SA 4.0." Prefer replacing these rows with the KB or the provinciale overzicht, which removes the share-alike obligation.
- Wikimedia Commons portraits: show the file page link, the author, and the license, for example "Foto: {author}, {license}, via Wikimedia Commons."

## 4. Recommendation on the ADR 0001 licenses

The proposed code license, MIT, stays. The code is our own work and no source imposes a copyleft obligation on it.

The proposed data license, CC0 1.0, should change to CC BY 4.0. Reasons, with the sources:

1. CBS data are CC BY 4.0 and attribution is mandatory. A CC0 dataset that contains CBS-derived counts still has to satisfy CBS's attribution, so the "no attribution" simplicity of CC0 is not actually available.
2. CPB points to CC BY 3.0 NL and PBL uses CC BY 4.0, both attribution licenses.
3. Workstream G used the nl.wikipedia.org burgemeester and dijkgraaf lists, which are CC BY-SA 4.0. We cannot place CC0 over a compilation that is itself CC BY-SA. The compilation may attract copyright even when the individual facts do not.
4. The project already commits to full per-fact provenance, so an attribution license costs nothing in practice and is more honest about the sources.

Recommended dataset license: **CC BY 4.0**, with an attribution file that lists every source, its license, and its required credit line.

Two conditions make CC BY 4.0 clean:

- Re-source the two Wikipedia-derived fields. Workstream G already names the KB's and the provinciale overzicht as the structural alternative. Replace the Wikipedia bulk rows before launch, then no share-alike content remains in the dataset.
- Keep images out of the dataset unless the per-file license permits reuse. `media.json` carries the license and credit per portrait, and an image without both does not ship.

If the owner still prefers CC0 for maximum reuse, the fallback is CC0 for our own contributions plus a mandatory attribution file and a clear note that CBS, CPB, PBL, and any Wikipedia-derived field retain their own attribution or share-alike terms. That is workable but more confusing than CC BY 4.0. The recommendation is CC BY 4.0.

This recommendation is input to ADR 0001. The owner records the decision there and drops the proposed status. Do not write `LICENSE` or `LICENSE-DATA` in this workstream.

## 5. Privacy determination

This restates and sharpens the boundary in `docs/12-discovery-privacy-accessibility-security.md` Part 2.

### 5.1 Personal data in scope

We process only people in a public function and only facts the government itself publishes:

- Name, official title, and the organization or position held.
- Tenure start and end dates, and acting (`waarnemend`) status.
- Party affiliation where an official source states it as part of the public function.
- Portfolio or portfolio area for a bewindspersoon.
- Birth date only where an official source publishes it and it is useful to distinguish people, for example the EK leden pages.
- An official portrait only with a recorded license and credit.

These facts are already public and are published by the state itself. The lawful basis is GDPR article 6(1)(e), a task carried out in the public interest, read with the fact that the data are manifestly made public by the data subject through the public function. Party affiliation is political-opinion data and so falls under article 9; we keep it only because the officeholder made it public through the public function and only for that function, under article 9(2)(e) substantial public interest and article 9(2)(e) with the manifest-public exception.

### 5.2 Personal data out of scope

We never collect:

- Private addresses or home locations.
- Contact details such as phone numbers, email addresses, or private social accounts.
- Family, relationship, or health data.
- Birth dates that are not officially published.
- Financial or tax data of individuals.
- Any data on private individuals who do not hold a public function.

The KOOP register also contains general employee and contact data. We ingest only the persons who fill a modeled public function, not the general staff lists, and we drop the contact fields.

### 5.3 Portraits and image rights

- Use Wikimedia Commons or an official source with a stated license.
- Record the author, the license, and the source file page per image in `media.json`.
- Do not ship a portrait without that record. This matches `docs/09` section 10 and `research/E-rechterlijke-macht.md`, which names the hogeraad.nl portraits as a determination gap.
- Portretrecht and AVG apply to recognisable persons; a reuse license from the photographer does not by itself settle the personality right. Where a portrait is of a living person and the license is unclear, use no image.

### 5.4 Deceased and historical figures

The same sourcing and the same care apply. The public-function boundary does not change with death, and we still do not add private data.

## 6. Retention, correction, and the correction log

### 6.1 Retention

- The published dataset keeps a version history so a past state can be re-derived.
- Dated raw snapshots under `research/raw/` are kept to make a published fact reproducible.
- State the retention period in the privacy statement. Proposed default: keep the dataset history and the raw snapshots for as long as the project runs, because they are the audit trail for every published fact.

### 6.2 Correction path

- A public contact address and a simple form or issue.
- A correction is assessed against the public-interest basis and the right to object. A factual error is fixed. A request to remove a public-function fact is weighed against the public interest and the project's source-backed purpose.
- Serious errors show a short note on the affected page for a period.

### 6.3 Correction-log language

Every correction is logged with the old value, the new value, the date, and the reason. A published fact is never silently edited.

Dutch entry:

> {YYYY-MM-DD}: {entiteit of persoon} - {veld} gewijzigd van "{oude waarde}" naar "{nieuwe waarde}". Reden: {reden}. Bron: {bron-url}, geraadpleegd {YYYY-MM-DD}.

English entry:

> {YYYY-MM-DD}: {entity or person} - {field} changed from "{old value}" to "{new value}". Reason: {reason}. Source: {source-url}, retrieved {YYYY-MM-DD}.

## 7. Gaps with endpoints

A workstream that reports a named gap passes; an invented determination fails. These are the open determinations.

1. Eerste Kamer exact annotation. The colofon requires an annotation but the rendered HTML did not carry its wording. Endpoint: https://www.eerstekamer.nl/begrip/colofon. Resume: read the annotation block or the underlying page source and record the exact text.
2. Eerste Kamer per-page content. The reuse right is on website content; confirm whether images and parlementaire documenten fall under the same terms. Endpoint: https://www.eerstekamer.nl/begrip/colofon.
3. tweedekamer.nl website pages. The OData portal is CC0; the website terms were not fetched. Endpoint: https://www.tweedekamer.nl. Resume: find the copyright or disclaimer page and record it.
4. raadvanstate.nl. 403 to automated fetch. Endpoint: https://www.raadvanstate.nl. Alternative: repository SRU and officielebekendmakingen. Resume: use the alternative or a manual read.
5. politie.nl. 403 to automated fetch. Endpoint: https://www.politie.nl.
6. nationaleombudsman.nl, ser.nl, rli.nl, hogeraad.nl. No license or copyright page found on the site. Endpoints as named. Resume: look for a colofon or terms page, or record "no stated license, facts only".
7. universiteitleiden.nl. No open license found; used once for a staff page. Endpoint: https://www.universiteitleiden.nl.
8. NOS, NU.nl, RTL Nieuws, FD, BNR. Individual terms pages not all fetched; the DPG, Mediahuis, and Sijthoff terms cover the shared class. Endpoints: https://over.nos.nl, https://www.nu.nl, https://www.rtlnieuws.nl, https://fd.nl, https://www.bnr.nl.
9. openraadsinformatie.nl. Named as a resume endpoint by G and I but not fetched. Endpoint: https://openraadsinformatie.nl. Resume: check its license before ingesting seat-level memberships.
10. waarstaatjegemeente.nl and allecijfers.nl. Not used by A to N; licenses unverified. Endpoints as named.
11. individual provincie, gemeente, and waterschapsites. Assumed CC0 by theme, not verified per site. Endpoint list in the research G source table.
12. Wikimedia Commons portraits. No portraits are in `media.json` yet. Every future portrait needs the per-file license and credit recorded. Endpoint: the file description page on Commons.
13. CBS tables. The CBS default is CC BY 4.0, but a specific table or download can carry an exception. Endpoint: the table page on https://opendata.cbs.nl. Resume: confirm the exception flag per table used.
14. Defensie CC BY-SA 4.0. Confirm whether any Defensie-derived field is actual text or only facts; if only facts, the share-alike does not attach. Endpoint: https://www.defensie.nl/service/copyright.

## Sources fetched for this determination

Retrieved 18-09-2026 unless noted.

- https://www.overheid.nl/help/officiele-bekendmakingen/bestanden-en-hergebruik
- https://www.overheid.nl/informatie-hergebruiken
- https://www.overheid.nl/over-deze-site/colofon
- https://www.overheid.nl/help/overheidsorganisaties
- https://organisaties.overheid.nl/
- https://data.overheid.nl/dataset/overheidsorganisaties-xml
- https://data.overheid.nl/dataset/open-data-portaal-van-de-tweede-kamer-der-staten-generaal
- https://data.overheid.nl/licenties-voor-hergebruik
- https://www.cbs.nl/nl-nl/over-ons/website/copyright
- https://www.cbs.nl/nl-nl/onze-diensten/open-data
- https://www.rijksoverheid.nl/service/copyright
- https://www.rijksoverheid.nl/opendata/voorwaarden
- https://www.koninklijkhuis.nl/service/copyright
- https://www.rijksdienstcn.com/service/copyright
- https://www.rijksfinancien.nl/copyright
- https://www.defensie.nl/service/copyright
- https://www.kiesraad.nl/service/copyright
- https://www.verkiezingsuitslagen.nl/Info/Copyright
- https://www.eerstekamer.nl/begrip/colofon
- https://www.rechtspraak.nl/colofon
- https://www.om.nl/service/copyright
- https://www.rekenkamer.nl/service/copyright
- https://www.wrr.nl/service/copyright
- https://www.raadopenbaarbestuur.nl/service/copyright
- https://www.onderwijsraad.nl/service/copyright
- https://www.gezondheidsraad.nl/service/copyright
- https://www.raadrvs.nl/service/copyright
- https://www.adviesraadinternationalevraagstukken.nl/service/copyright
- https://www.awti.nl/service/copyright
- https://www.scp.nl/service/copyright
- https://www.cpb.nl/copyright
- https://www.pbl.nl/over-het-pbl/copyright
- https://www.parlement.com/over-deze-site
- https://nl.wikipedia.org/wiki/Wikipedia:Auteursrechten
- https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use
- https://commons.wikimedia.org/wiki/Commons:Licensing
- https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
- https://www.dpgmediagroup.com/en-BE/terms-of-use
- https://adverteren.nrc.nl/onze-media
- https://www.binnenlandsbestuur.nl/algemene-voorwaarden-privacy-statement
- https://fd.nl/copyright

Raw evidence for the key license quotes is under `research/raw/O/`.
