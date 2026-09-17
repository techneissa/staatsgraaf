# Endpoint verification (Phase 0)

All URLs probed live on 2026-09-17. Raw probe output: `research/raw/00/endpoint-probe-results.txt` and the per-source `.out`/`.json` snapshots under `research/raw/00/`. Status is the HTTP status seen by curl/fetch on that date. Where a source blocked us, an alternative is named. Workstreams must cite the working URL they actually fetched, not this page.

## 1. Legal sources

| Source | Working URL | Status | Call notes |
| --- | --- | --- | --- |
| wetten.overheid.nl (HTML) | https://wetten.overheid.nl/BWBR0001840 | 200 | Article pages render as HTML. Use `/jci1.3` permalinks for stable deep links. |
| wetten.overheid.nl (XML) | (none found) | 404 | `/xml/BWBR0001840` and `/xml/BWBR0001840/date/0/0` both 404. Machine-readable wetgeving comes from the SRU below (collection overheidbwb). |
| repository.overheid.nl SRU | https://repository.overheid.nl/sru?query=<query> | 200 | SRU 1.2. Works with and without `x-collection`. `x-collection=prb` targets officiële publicaties. Example probe returned 15.420 records. Use for wetgeving XML and Kamerstukken. |
| officielebekendmakingen.nl | https://www.officielebekendmakingen.nl/ | 200 | Landing site. Search UI runs at https://zoek.officielebekendmakingen.nl/ (200, SPA). |
| zoek.officielebekendmakingen.nl (legacy search paths) | (none) | 404 | Old `/zoeken/resultaat/...` and `/zoeken/sru` patterns 404. Use the SPA UI or the repository SRU for results. |
| Kiesraad | https://www.kiesraad.nl/verkiezingen (200) and https://www.kiesraad.nl/actueel/nieuws (200) | 200 | Verkiezingsuitslagen and news; both pages fetched clean. |

## 2. Parlement

| Source | Working URL | Status | Call notes |
| --- | --- | --- | --- |
| Tweede Kamer OData | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0 | 200 | OData v4. Metadata at `/$metadata`. Sets include Fractie, FractieZetel, FractieZetelPersoon, FractieZetelVacature, Persoon, PersoonLoopbaan, Commissie, CommissieZetel, CommissieZetelPersoon, Activiteit, Vergadering, Besluit, Stemming, Zaak, Kamerstukdossier, Document. |
| TK OData paging | `?$top=250` works; `$top` above 250 returns HTTP 400 | 400 over cap | Page with `$skip`; plain endpoint `$top=4000` returned exactly 4000 rows, a hard cap. `Verwijderd eq false` filter is reliable. |
| TK website | https://www.tweedekamer.nl | 200 | Member list: `/kamerleden_en_commissies/alle_kamerleden/<naam>-<init>-<partij>`; page 1 carried 148 member cards. |
| Eerste Kamer fracties | https://www.eerstekamer.nl/fracties | 200 | Fractie names + seat counts parsed from the page. |
| Eerste Kamer leden | https://www.eerstekamer.nl/alle_leden | 200 | 75 member cards with naam, fractie, "Anciënniteit: N dagen", Geboortedatum, Woonplaats; member pages at `/persoon/<slug>`. |
| EK personele mutaties | https://www.eerstekamer.nl/personele_mutaties | 200 | Mutation list (200 items on the probe), useful for the change feed. |

## 3. Executive and judiciary

| Source | Working URL | Status | Call notes |
| --- | --- | --- | --- |
| Rijksoverheid | https://www.rijksoverheid.nl | 200 | Ministeries at `/ministeries`, bewindspersonen at `/regering/bewindspersonen/<slug>`, veiligheidsregio's at `/themas/recht-veiligheid-en-defensie/veiligheidsregios-en-crisisbeheersing/veiligheidsregios`. Person pages carry DCTERMS.rights = CC0 1.0 Universal. Also serves RSS. |
| Raad van State | (blocked) | 403 | raadvanstate.nl returns 403 to automated fetch. Alternative: repository SRU search of its publications; record remaining gaps in workstream F. |
| Algemene Rekenkamer | https://www.rekenkamer.nl/ | 200 | |
| Nationale ombudsman | https://www.nationaleombudsman.nl/ | 200 | |
| Rechtspraak | https://www.rechtspraak.nl/ | 200 | |
| Hoge Raad | https://www.hogeraad.nl/ | 200 | |
| Openbaar Ministerie | https://www.om.nl/ | 200 | |
| Politie | https://www.politie.nl/ | 200 | |
| Defensie | https://www.defensie.nl/ | 200 | |

## 4. Adviescolleges en planbureaus

| Source | Working URL | Status | Call notes |
| --- | --- | --- | --- |
| SER | https://www.ser.nl/ | 200 | |
| WRR | https://www.wrr.nl/ | 200 | |
| Rli | https://www.rli.nl/ | 200 | |
| ROB/Rfv | https://www.rob-rfv.nl/ | 200 | |
| Onderwijsraad | https://www.onderwijsraad.nl/ | 200 | |
| Gezondheidsraad | https://www.gezondheidsraad.nl/ | 200 | |
| Raad voor Volksgezondheid en Samenleving | https://www.raadrvs.nl/ | 200 | |
| Adviesraad Migratie | https://www.adviesraadmigratie.nl/ | 200 | The domain adviesraad-migratie.nl does not resolve; use adviesraadmigratie.nl. |
| AWTI | https://www.awti.nl/ | 200 | |
| CPB | https://www.cpb.nl/ | 200 | |
| PBL | https://www.pbl.nl/ | 200 | |
| SCP | https://www.scp.nl/ | 200 | |

## 5. Decentraal

| Source | Working URL | Status | Call notes |
| --- | --- | --- | --- |
| CBS OpenData API | https://opendata.cbs.nl/ODataApi/OData/<tableId> | 200 | Pattern: `/ODataApi/OData/86247NED/RegioS?$filter=...&$top=N`. Catalog: https://opendata.cbs.nl/ODataCatalog/Tables (Atom XML, ~18 MB). |
| CBS gemeenten | table 86247NED, entity RegioS | 200 | Gebieden in Nederland 2026; 342 rows with key GM####. |
| CBS provincies | table 70072ned, entity RegioS, `$filter=startswith(Key,'PV')` | 200 | 12 rows PV20-PV31. |
| CBS waterschappen | table 80445ned, entity Waterschappen | 200 | 34 rows incl. historic; 21 current waterschappen per the table's 1 januari 2017 indeling. |
| IPO | https://www.ipo.nl/ | 200 | |
| VNG | https://vng.nl/ | 200 | |
| Open Raadsinformatie | https://openraadsinformatie.nl/ | 200 | |
| AlleCijfers | https://allecijfers.nl/ | 200 | Alternative for wherestaatjegemeente.nl (unreachable). Check license before reuse. |
| Waar staat je gemeente | (unreachable) | 000 | No response from waarstaatjegemeente.nl on probe date. |
| UVW | (blocked) | 403 | uvw.nl blocked automated fetch. |
| Waterschappen.nl | (blocked) | 403 | waterschappen.nl blocked automated fetch; CBS 80445ned is the waterschappen count source. |

## 6. Caribisch Nederland en Koninkrijk

| Source | Working URL | Status | Call notes |
| --- | --- | --- | --- |
| Rijksdienst Caribisch Nederland | https://www.rijksdienstcn.com/ | 200 | |

## 7. Budget en financiën

| Source | Working URL | Status | Call notes |
| --- | --- | --- | --- |
| Rijksfinancien | https://www.rijksfinancien.nl/ | 200 | Machine interface not yet verified; a named gap for workstream L. |
| Data.overheid.nl | https://data.overheid.nl/ | 200 | Open data register, useful for datasets and licenses. |
| Rijksoverheid begroting | (none) | 404 | `/onderwerpen/rijksbegroting` 404; workstream L finds the current begroting page. |

## 8. Nieuws (RSS)

Working feeds, probed 2026-09-17:

| Feed | URL | Status |
| --- | --- | --- |
| NOS | https://feeds.nos.nl/nosnieuwsalgemeen | 200 |
| NU.nl | https://www.nu.nl/rss/Algemeen | 200 |
| NRC | https://www.nrc.nl/rss/ | 200 |
| AD | https://www.ad.nl/rss.xml | 200 |

Failed on probe date (workstream J finds correct paths or records the gap): volkskrant.nl/rss 404, trouw.nl/rss 404, parool.nl/rss 404, fd.nl/rss 404, rtlnieuws.nl/rss 404, bnr.nl/rss 403, binnenlandsbestuur.nl/rss 404. The three-feed minimum for workstream J is already met.

## Known blocked sources (record as gaps, never evade)

raadvanstate.nl (403), uvw.nl (403), waterschappen.nl (403), waarstaatjegemeente.nl (000), bnr.nl (403). Use the named alternatives or record the gap with the endpoint to fill it.

## Probe method

Plain HTTPS GET with a browser-like User-Agent, no cookies, single request per URL, 2026-09-17. Paywalls and blocks were respected; no probe attempted to bypass any protection.
