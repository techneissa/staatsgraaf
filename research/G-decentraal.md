# Workstream G, Decentraal: provincies, waterschappen, gemeenten, BES

## Scope covered

The decentralized tier, in this order: the 12 provincies with their organs, the 21 waterschappen, all 342 gemeenten per the CBS 2026 indeling, the 3 openbare lichamen BES plus the Rijksvertegenwoordiger, and, added in a completion pass, the 25 veiligheidsregio's as samenwerkingsverbanden. The Rijk (workstreams A to F) is out of scope; the other samenwerkingsverbanden (GGD'en, omgevingsdiensten) remain out of scope and are named as gaps.

Covered:

- 12 provincies, each with Provinciale Staten (elected) and Gedeputeerde Staten (executive), and a Commissaris van de Koning position. All 12 CvdK holders with a dated tenure.
- 21 waterschappen, each with Algemeen Bestuur (elected) and Dagelijks Bestuur (executive), and a dijkgraaf position. All 21 dijkgraven with a dated tenure (month precision for most).
- 342 gemeenten, each with a gemeenteraad (elected, seats from the KOOP register) and a college van burgemeester en wethouders (executive), and a burgemeester position. 340 burgemeesters with a dated tenure, 2 named gaps.
- 3 openbare lichamen BES (Bonaire, Sint Eustatius, Saba), each with an eilandsraad, a bestuurscollege and a gezaghebber, plus the Rijksvertegenwoordiger.
- 25 veiligheidsregio's as `department`-organizations with `subtype: samenwerkingsverband`, `level: regionaal`, added in a completion pass. All 25 names and websites come from the Rijksoverheid overview; the KOOP register confirms each as a regionaal samenwerkingsorgaan. No heads, seats or member municipalities are added.

Counts produced:

| Entity | Count |
| --- | --- |
| Organizations | 1160 |
| Positions | 1135 |
| People | 377 |
| Tenures | 377 |
| Relations | 1854 |
| Memberships | 0 (intentional, see Decisions) |
| Sources | 30 |
| Gaps | 12 |

Organizations break down as 36 provinciaal (12 x provincie, PS, GS), 1026 lokaal (342 x gemeente, raad, college), 63 waterschap (21 x waterschap, AB, DB), 9 BES (3 x openbaar lichaam, eilandsraad, bestuurscollege), 1 Rijksvertegenwoordiger and 25 regionaal (the veiligheidsregio's). The top-level count of gemeenten is 342, equal to CBS table 86247NED and to the Phase 0 snapshot. The veiligheidsregio count is 25, equal to the Phase 0 snapshot section 8.

Boundary: the organs are modeled as organizations, the head offices as positions, and the head officeholders as people plus tenures. Seat-level membership of the elected bodies is deliberately not filled; it is the long tail and is recorded as a gap.

## Sources fetched with dates

Fetched or reused by this workstream:

| Source | URL | Retrieved | Yield |
| --- | --- | --- | --- |
| CBS, Gebieden in Nederland 2026 (86247NED) | https://opendata.cbs.nl/ODataApi/OData/86247NED | 2026-09-17 | 342 gemeenten, GM keys (cached) |
| CBS, Provincies (70072ned) | https://opendata.cbs.nl/ODataApi/OData/70072ned | 2026-09-17 | 12 provincies, PV20 to PV31 (cached) |
| CBS, Waterschappen (80445ned) | https://opendata.cbs.nl/ODataApi/OData/80445ned | 2026-09-17 | 21 current waterschappen, WS02 to WS32 (cached) |
| Kiesraad, Provinciale Staten | https://www.kiesraad.nl/verkiezingen/provinciale-staten | 2026-09-17 | Statenzetels per provincie, 2023 (cached) |
| Kiesraad, Waterschappen | https://www.kiesraad.nl/verkiezingen/waterschappen | 2026-09-17 | 21 waterschappen, AB 18 to 30 leden (cached) |
| Kiesraad, Eilandsraden | https://www.kiesraad.nl/verkiezingen/eilandsraden | 2026-09-17 | Eilandsraadzetels 9, 5, 5 (cached) |
| KOOP, Register van Overheidsorganisaties, gemeenten (CSV) | https://organisaties.overheid.nl/export/Gemeenten.csv | 2026-09-18 | 342 gemeenten, website, raadszetels, organisatiecode gm#### |
| KOOP, Register van Overheidsorganisaties, provincies (CSV) | https://organisaties.overheid.nl/export/Provincies.csv | 2026-09-18 | 12 provincies met website |
| KOOP, Register van Overheidsorganisaties, waterschappen (CSV) | https://organisaties.overheid.nl/export/Waterschappen.csv | 2026-09-18 | 21 waterschappen met website |
| Rijksoverheid, Overzicht commissarissen van de Koning | https://www.rijksoverheid.nl/themas/overheid-en-democratie/provincies/commissaris-van-de-koning/overzicht/commissarissen-van-de-koning | 2026-09-18 | 12 CvdK met partij, benoemingsdatum en geboortedatum |
| Provincie Fryslân, CvdK | https://www.fryslan.frl/commissaris-van-de-koning | 2026-09-17 | Arno Brok (cached) |
| Provincie Groningen, CvdK | cached onder research/raw/G/, canonieke URL niet vastgelegd | 2026-09-17 | René Paas, begonnen 18 april 2016 |
| Provincie Drenthe, CvdK | https://www.provincie.drenthe.nl/organisatie-bestuur/gedeputeerde-staten/commissaris-koning/ | 2026-09-17 | Agnes Mulder (cached) |
| Provincie Overijssel, CvdK | https://www.overijssel.nl/bestuur/commissaris-van-de-koning | 2026-09-17 | Andries Heidema (cached) |
| Provincie Flevoland, CvdK | cached onder research/raw/G/ | 2026-09-17 | Arjen Gerritsen, sinds 1 november 2023 |
| Provincie Gelderland, CvdK | cached onder research/raw/G/ | 2026-09-17 | Daniël Wigboldus, sinds 19 maart 2025 |
| Provincie Utrecht, CvdK | cached onder research/raw/G/ | 2026-09-17 | Hans Oosters, sinds 1 februari 2019 |
| Provincie Noord-Holland, CvdK | https://www.noord-holland.nl/Bestuur/Commissaris_van_de_Koning | 2026-09-18 | Arthur van Dijk, sinds 7 januari 2019 (via zoekresultaat, fetch geblokkeerd) |
| Provincie Zuid-Holland, CvdK | https://www.zuid-holland.nl/politiek-bestuur/commissaris-van-de-koning/ | 2026-09-17 | Wouter Kolff (cached) |
| Provincie Zeeland, CvdK | https://www.zeeland.nl/gedeputeerde-staten/commissaris-van-de-koning | 2026-09-17 | Hugo de Jonge (cached) |
| Provincie Noord-Brabant, CvdK | https://www.brabant.nl/bestuur/commissaris-koning/ | 2026-09-17 | Ina Adema (cached) |
| Provincie Limburg, CvdK | https://www.limburg.nl/bestuur/commissaris-koning/ | 2026-09-17 | Emile Roemer, sinds 1 december 2021 (cached) |
| Wikipedia, Lijst van burgemeesters 2025-2029 | https://nl.wikipedia.org/wiki/Lijst_van_burgemeesters_van_gemeenten_in_Nederland_in_de_periode_2025-2029 | 2026-09-18 | Bulk: 340 zittende burgemeesters met benoemingsdatum |
| Wikipedia, Dijkgraaf (waterschap) | https://nl.wikipedia.org/wiki/Dijkgraaf_(waterschap) | 2026-09-18 | Bulk: 21 dijkgraven met maand van indiensttreding |
| Rijksdienst Caribisch Nederland, Rijksvertegenwoordiger | https://www.rijksdienstcn.com/over-de-rijksdienst-caribisch-nederland/de-rijksvertegenwoordiger | 2026-09-18 | Jan Helmond, waarnemend sinds 1 januari 2018 |
| Rijksdienst Caribisch Nederland, Actueel | https://www.rijksdienstcn.com/actueel | 2026-09-18 | Gezaghebberbenoemingen 2026 (Saba, waarneming Bonaire) |
| Rijksoverheid, John Soliano gezaghebber Bonaire | https://www.rijksoverheid.nl/actueel/nieuws/2024/06/14/john-soliano-nieuwe-gezaghebber-van-bonaire | 2026-09-18 | Benoeming per 1 augustus 2024 |
| Rijksdienst Caribisch Nederland, Alida Francis gezaghebber Sint Eustatius | https://www.rijksdienstcn.com/actueel/nieuws/2024/april/10/alida-francis-beedigd-als-gezaghebber-van-sint-eustatius | 2026-09-18 | Beëdigd 10 april 2024 |
| Provinciewet | https://wetten.overheid.nl/BWBR0005645 | 2026-09-17 | Rechtsgrond provincie en organen (cached) |
| Gemeentewet | https://wetten.overheid.nl/BWBR0005416 | 2026-09-17 | Rechtsgrond gemeente en organen (cached) |
| Waterschapswet | https://wetten.overheid.nl/BWBR0005108 | 2026-09-17 | Rechtsgrond waterschap en organen (cached) |
| Wet openbare lichamen Bonaire, Sint Eustatius en Saba | https://wetten.overheid.nl/BWBR0028142 | 2026-09-17 | Rechtsgrond BES en Rijksvertegenwoordiger (cached) |
| Rijksoverheid, Overzicht veiligheidsregio's | https://www.rijksoverheid.nl/themas/recht-veiligheid-en-defensie/veiligheidsregios-en-crisisbeheersing/veiligheidsregios | 2026-09-17 | 25 veiligheidsregio's met naam en link naar de eigen website (cached in research/raw/00) |
| KOOP, Register van Overheidsorganisaties, regionale samenwerkingsorganen | https://organisaties.overheid.nl/Regionale_samenwerkingsorganen/ | 2026-09-18 | 25 veiligheidsregio's als regionaal samenwerkingsorgaan met officiële naam en afkorting |
| KOOP, detailpagina Veiligheidsregio Groningen | https://organisaties.overheid.nl/23862472/Veiligheidsregio_Groningen | 2026-09-18 | Steekproef: website en adres bevestigd, geen voorzitter of leden gepubliceerd |
| Wet veiligheidsregio's | https://wetten.overheid.nl/BWBR0027466 | 2026-09-18 | Rechtsgrond veiligheidsregio, art. 8; HTTP 200 |

Crawl discipline: no individual gemeente site was fetched. The gemeente list, raad seats and websites come from CBS plus the KOOP register, so the crawl stayed under 30 requests against a cap of a few hundred. All new requests used one GET, a browser-like user agent, no cookies, and respected blocks (noord-holland.nl refused the automated fetch; its CvdK is recorded from the official page content seen via search and marked medium where needed).

## Decisions

- Executive colleges use `type: commission` and `subtype: commissie`, because the schema has no dedicated subtype for Gedeputeerde Staten, college van B&W, Dagelijks Bestuur or bestuurscollege. This follows the mapping in `docs/03` section 4 where a standing college with a mandate is a `commission`. Alternative not taken: adding new subtypes in this workstream, which would require a schema change through `docs/04` section 18.
- Elected bodies use `type: elected` with the named subtypes `provinciale-staten`, `gemeenteraad`, `algemeen-bestuur-waterschap` and `eilandsraad`.
- The Commissaris van de Koning, burgemeester, dijkgraaf and gezaghebber are positions (`type: dept_head`), not organizations, with `exOfficioOf` pointing at the bodies they chair. Each also has `ex_officio` relations to those bodies. Alternative not taken: modeling each office as a one-seat organization.
- Members and portfolio holders (gedeputeerde, wethouder, lid dagelijks bestuur, eilandgedeputeerde, and the seat positions lid staten, raadslid, lid algemeen bestuur, eilandsraadlid) get one position record each, with `seatsCount` on the seat-level positions where the count is published. `memberships` is empty by decision, not by omission; see the gap on the long tail.
- The Rijksvertegenwoordiger is modeled as a small organization (`subtype: commissie`, `level: caribisch`) holding one `dept_head` position, because the position schema requires an owning organization and no existing organization covers this office.
- Organs carry `parent` and `partOf` to their province, gemeente, waterschap or openbaar lichaam, and the parent `consists_of` its organs. `oversees` runs from each provincie to each of its gemeenten, sourced from the CBS indeling plus the Provinciewet toezicht. `part_of` is not duplicated as an edge.
- The gemeente, raad and college key is the KOOP organisatiecode `gm####`, joined to the CBS key `GM####`. For 12 recent gemeenten without a KOOP code the join falls back to the normalized name.
- `slug` transliterates Dutch diacritics: Fryslân to `fryslan`, Súdwest-Fryslân to `sudwest-fryslan`, 's-Gravenhage to `s-gravenhage`, Bergen (NH.) to `bergen-nh`. Accented alternatives are kept in `aliases` where they differ.
- Dijkgraaf tenures with only a month in the source use the first day of that month as `start`, at medium confidence, with a single gap that lists all 21 and the resume action. Alternative not taken: leaving those tenures out, which would lose the holder.
- Burgemeester tenures come from the Wikipedia bulk list at medium confidence, because no open machine-readable national register of burgemeesters exists; the per-provincie and KB route is named as a gap. The KOOP register supplies the raad seat counts at high confidence.
- `description` is left null on every organization. Writing 1160 sourced descriptions is a content task, not a research task, and an unsourced sentence would violate the one hard rule.
- Health sites were treated as primary where fetched, and as derived facts where a date had to be assembled (CvdK start dates come from the Rijksoverheid overview, not from prose).
- Veiligheidsregio's are `type: department`, `subtype: samenwerkingsverband`, `level: regionaal`, following `docs/03` section 2.6, which treats samenwerkingsverbanden as department-type bodies at regionaal level. The schema also carries a dedicated `veiligheidsregio` subtype; this pass keeps `samenwerkingsverband` as instructed and flags the choice as an open question.
- Veiligheidsregio branch is `decentraal-lokaal`, not `zelfstandig`. A veiligheidsregio is a gemeenschappelijke regeling whose deelnemers are gemeenten (and provincies); its authority derives from the decentrale kolom, not from the Rijk. `zelfstandig` is reserved for independent bodies with their own statutory task such as ZBO's and RWT's.
- Veiligheidsregio `name` is `Veiligheidsregio <label>` on the Rijksoverheid overview and `website` is the link that page publishes for the regio, so the website is sourced to the Rijksoverheid overview at high confidence. No per-regio site was crawled, so no per-regio source record was added. The KOOP register confirms each as a regionaal samenwerkingsorgaan and supplies the abbreviation used in `aliases`.
- Veiligheidsregio `legalSource` is `Wet veiligheidsregio's art. 8` at https://wetten.overheid.nl/BWBR0027466. Verified HTTP 200 on 2026-09-18. It is the consolidated law page, not a standalone article permalink; article 8 is reachable at the in-page anchor `#Paragraaf3_Artikel8`. The label is kept as instructed. The wet is also declared as a source and referenced from each regio.
- The veiligheidsregio pass is append-only: no existing organization, source or gap record was edited. No heads, seats or member municipalities were invented, and no `joint_arrangement_member` or `part_of` edges were drawn, because those facts are not in the fetched sources.

## Gaps

Mirrors `gaps[]` in `research/G-decentraal.json`.

1. Zittende burgemeester van Nuenen, Gerwen en Nederwetten. The bulk list has no row without an aftredingsdatum. Endpoint: https://www.rijksoverheid.nl/onderwerpen/gemeenten. Resume: find the sitting burgemeester and add person, tenure and source.
2. Zittende burgemeester van Zwartewaterland. Same. Note: the provincie Overijssel publishes an official overzicht that lists J. Compagner per 26 november 2025; that page should be fetched and parsed.
3. Exacte installatiedatum van 21 dijkgraven. The bulk source gives only the month; the tenure start is the first of the month as a documented derivation. Endpoint: https://www.waterschappen.nl/. Resume: read each waterschap's own news item or the Staatscourant KB and set the exact day.
4. Alle raadsleden, statenleden en leden van algemeen besturen (about 8,000 to 9,000 people). Seat-level membership needs the raadsinformatiesystemen. Endpoint: https://openraadsinformatie.nl/. Resume: build `memberships[]` per body with seatNumber and fractie where the source provides it.
5. Namen en aantallen van wethouders, gedeputeerden, leden dagelijks bestuur en eilandgedeputeerden. Published per body, not in a national register. Endpoint: https://organisaties.overheid.nl/. Resume: walk each college page and fill the member positions.
6. Aantal leden van de algemene besturen van de 21 waterschappen. The Kiesraad gives a band of 18 to 30; the exact count is in each reglement. waterschappen.nl and uvw.nl returned 403. Endpoint: https://www.waterschappen.nl/. Resume: read the reglement or bestuurspagina per waterschap.
7. Raadsgriffies per gemeente. Not published as a separate organization in KOOP or CBS. Endpoint: https://organisaties.overheid.nl/. Resume: add a griffie organization and a griffier position where the gemeente publishes one.
8. Burgemeesters: structurele bron. The bulk source is secondary. Endpoint: https://zoek.officielebekendmakingen.nl/. Resume: replace each with the KB in the Staatscourant or the provinciale overzichten.
9. Gezaghebber Bonaire: lopende waarneming. Jeaninne Wong-Loi-Sing is per 21 juli 2026 waarnemend gezaghebber naast de zittende gezaghebber. Endpoint: https://www.rijksdienstcn.com/actueel. Resume: add a second tenure with `acting: true` and close it when a source states the end.
10. Eilandsraadzetels vanaf de verkiezingen van 17 maart 2027. Wet van 8 juli 2026 (Stb. 2026, 221) raises Bonaire to 11, Sint Eustatius and Saba to 7. Endpoint: https://zoek.officielebekendmakingen.nl/stb-2026-221.html. Resume: update `seatsCount` after March 2027.
11. Relaties naar veiligheidsregio's en andere gemeenschappelijke regelingen. This was the pre-completion state recorded in JSON gap index 10 and is left unedited there per the append-only rule. Resolved for the organizations in the completion pass: all 25 veiligheidsregio's now exist as `org:veiligheidsregio-*`. What remains is tracked as gap 12.
12. Veiligheidsregio's: bestuurshoofden, bestuursleden en deelnemende gemeenten. The 25 regio's exist, but the bestuur is formed by the burgemeesters of the participating gemeenten and neither the Rijksoverheid overview nor the KOOP register publishes voorzitters, a ledenlijst or the exact number of algemeen-bestuurszetels. The related GGD'en and omgevingsdiensten are not created. Endpoint: https://organisaties.overheid.nl/Regionale_samenwerkingsorganen/. Resume: walk each regio's bestuurspagina and gemeenschappelijke regeling, add the voorzitter as a `dept_head` position, the deelnemende gemeenten as `joint_arrangement_member` relations, the AB `seatsCount`, and create the GGD'en and omgevingsdiensten. This mirrors JSON gap index 11.

## Open questions

- Schema: should `gedeputeerde-staten`, `college-van-burgemeester-en-wethouders`, `dagelijks-bestuur-waterschap` and `bestuurscollege` become first-class subtypes instead of `commissie`? Owner decision, proposed in this workstream and best recorded as an ADR before the merge.
- Should a `waarnemend` head be a second open tenure (acting) next to the substantive holder, or a replacement tenure with a stated reason? Now only the substantive holder is modeled and the waarneming is a gap. Workstream I owns the tenure model.
- Veiligheidsregio subtype: should the 25 records use the schema's dedicated `veiligheidsregio` subtype instead of `samenwerkingsverband`? This pass used `samenwerkingsverband` as instructed; the more specific subtype exists but is unused so far. Orchestrator decision. The GGD'en and omgevingsdiensten still need an owning workstream, and the `joint_arrangement_member` edges from gemeenten need a sourced deelnemerslijst.
- The KOOP register publishes the raad party distribution per gemeente ("Raad (partij (aantal zetels))"). It is not a person-level fact and has no place in `memberships[]`; should the model gain a party-seat record or should this stay a gap? Owner decision.
- `employees` and `seatsCount` for the executive colleges (number of gedeputeerden and wethouders) are not in a national register. Is a per-body crawl acceptable at the merge gate, or should these stay null? Orchestrator decision.
