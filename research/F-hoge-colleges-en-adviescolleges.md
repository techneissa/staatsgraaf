# Workstream F: Hoge Colleges van Staat en adviescolleges

## Scope covered

This workstream covers the Hoge Colleges van Staat and the adviescolleges and planbureaus of the Rijk, as listed in `docs/05-research-workstreams.md` workstream F.

Covered as organizations: Raad van State, Algemene Rekenkamer en Nationale ombudsman (Hoge Colleges), Kiesraad, SER, WRR, Rli, ROB, Onderwijsraad, Gezondheidsraad, RVS, AIV, Adviesraad Migratie, AWTI (adviescolleges) en CPB, PBL, SCP (planbureaus).

Delivered counts: 17 organizations, 17 head positions, 17 people, 17 tenures, 20 advises relations, 99 source records and 11 gaps. Every listed body has a legal source, a website and, where the body publishes it, a head with a start date.

Boundary against the neighbouring workstreams: the Eerste Kamer and Tweede Kamer are Hoge Colleges van Staat but belong to workstream D. They are not duplicated here; `org:eerste-kamer` and `org:tweede-kamer` from `research/D-parlement.json` are the cross-reference. Workstream H owns the article-level legal mapping. Workstream I owns predecessor chains and the wider person set.

Two names in the scope list turned out to be one body: the Adviescommissie voor Vreemdelingenzaken (ACVZ) and the Adviesraad Migratie are the same organization. It is modeled once, as `org:adviesraad-migratie`, with ACVZ as an alias.

## Sources fetched with dates

All fetches below were done on 18-09-2026, fresh, unless a date says otherwise. Legal texts were fetched from wetten.overheid.nl on the same date. Raw snapshots are under `research/raw/F/` with `-2026-09-18` names. The cancelled run left `aiv-*` and `am-*` snapshots from 17-09-2026; those were superseded by fresh fetches on 18-09-2026 and are kept only as raw history.

Hoge Colleges:

- Rijksoverheid, benoeming vice-president Raad van State, https://www.rijksoverheid.nl/actueel/nieuws/2026/04/17/benoeming-vice-president-raad-van-state, 18-09-2026. Sybrand van Haersma Buma per 1 juli 2026.
- Algemene Rekenkamer, https://www.rekenkamer.nl/ en https://www.rekenkamer.nl/over-de-algemene-rekenkamer/organisatie/college/pieter-duisenberg, 18-09-2026. President sinds 1 september 2023.
- Nationale ombudsman, https://www.nationaleombudsman.nl/wie-is-de-nationale-ombudsman, 18-09-2026. Reinier van Zutphen.
- raadvanstate.nl, https://www.raadvanstate.nl/, 18-09-2026. HTTP 403 voor fetch; alleen als website-URL gebruikt.

Adviescolleges en Kiesraad:

- Kiesraad, https://www.kiesraad.nl/over-ons/leden-kiesraad, https://www.kiesraad.nl/personen/leden-kiesraad/wim-kuijken, https://www.kiesraad.nl/actueel/nieuws/2020/10/02/nieuwe-voorzitter-kiesraad en https://www.kiesraad.nl/actueel/nieuws/2024/09/26/carolien-van-ham-nieuw-lid-kiesraad-en-herbenoeming-voorzitter-wim-kuijken, 18-09-2026. Zeven leden; Wim Kuijken voorzitter sinds 1 januari 2021.
- SER, https://www.ser.nl/nl/ser/over-ser, https://www.ser.nl/nl/ser/raad/voorzitters en https://www.ser.nl/nl/ser/raad/raadsleden, 18-09-2026. Kim Putters vanaf 16 september 2022.
- WRR, https://www.wrr.nl/over-de-wrr/raad-en-adviserende-leden, https://www.wrr.nl/personen/raad-en-adviserende-leden/corien-prins en https://www.wrr.nl/actueel/nieuws/2026/06/24/voorzitter-corien-prins-verlaat-de-wrr, 18-09-2026. Corien Prins voorzitter sinds 2017.
- Rli, https://www.rli.nl/over-de-raad en https://www.rli.nl/raadsleden, 18-09-2026, plus Rijksoverheid, https://www.rijksoverheid.nl/actueel/nieuws/2024/02/16/benoeming-voorzitter-raad-voor-de-leefomgeving-en-infrastructuur. Jan Jacob van Dijk per 1 augustus 2024.
- ROB, https://www.raadopenbaarbestuur.nl/over-de-rob en https://www.raadopenbaarbestuur.nl/personen/raad/mariette-hamer, 18-09-2026. Mariëtte Hamer, termijn 1 november 2025 tot 31 oktober 2029.
- Onderwijsraad, https://www.onderwijsraad.nl/over-ons en https://www.onderwijsraad.nl/actueel/nieuws/2024/06/14/louise-elffers-vanaf-1-september-voorzitter-onderwijsraad, 18-09-2026. Louise Elffers per 1 september 2024.
- Gezondheidsraad, https://www.gezondheidsraad.nl/over-ons/organisatie/raad en https://www.gezondheidsraad.nl/over-ons/organisatie/raad/voorzitter-prof.-dr.-k.-stronks, 18-09-2026. Karien Stronks sinds 1 januari 2025.
- RVS, https://www.raadrvs.nl/over-de-rvs/de-raad en https://www.raadrvs.nl/personen/raad/prof.-dr.-m.-jet-bussemaker, 18-09-2026. Jet Bussemaker sinds 1 juni 2019.
- AIV, https://www.adviesraadinternationalevraagstukken.nl/over-de-aiv, https://www.adviesraadinternationalevraagstukken.nl/over-de-aiv/organisatie/adviesraad en https://www.adviesraadinternationalevraagstukken.nl/personen/adviesraad/bert-koenders, 18-09-2026. Bert Koenders voorzitter.
- Adviesraad Migratie, https://www.adviesraadmigratie.nl/over-de-adviesraad-migratie, https://www.adviesraadmigratie.nl/25-jaar-adviesraad-migratie en https://www.adviesraadmigratie.nl/personen/monique-kremer, 18-09-2026. Monique Kremer voorzitter. Register: https://organisaties.overheid.nl/115625/Adviesraad_Migratie.
- AWTI, https://www.awti.nl/over-ons, https://www.awti.nl/over-ons/raadsleden, https://www.awti.nl/personen/raadsleden/mirjam-van-praag en https://www.awti.nl/actueel/nieuws/2026/09/11/mirjam-van-praag-stopt-op-1-januari-als-voorzitter-van-de-awti, 18-09-2026. Mirjam van Praag sinds 1 maart 2025, vertrek per 1 januari 2027.

Planbureaus:

- CPB, https://www.cpb.nl/over-het-cpb, https://www.cpb.nl/medewerkers en https://www.cpb.nl/medewerkers/pieter-hasekamp, 18-09-2026. Pieter Hasekamp sinds 1 maart 2020.
- PBL, https://www.pbl.nl/over-het-pbl en https://www.pbl.nl/over-het-pbl/directie, 18-09-2026, plus Algemene Bestuursdienst, https://www.algemenebestuursdienst.nl/actueel/nieuws/2022/10/07/marko-hekkert-directeur-planbureau-voor-de-leefomgeving. Marko Hekkert per 1 januari 2023.
- SCP, https://www.scp.nl/over-het-scp/zo-werken-wij en https://www.scp.nl/actueel/nieuws/2022/05/20/karen-van-oudenhoven-van-der-zee-vanaf-1-oktober-nieuwe-directeur-van-het-sociaal-en-cultureel-planbureau, 18-09-2026. Karen van Oudenhoven-van der Zee sinds 1 oktober 2022.

Rijksoverheid contactgids, all 18-09-2026, used for the coordinating ministry per body: SER, Onderwijsraad, Gezondheidsraad, RVS, AWTI, CPB, PBL, Algemene Rekenkamer, Nationale ombudsman, Kiesraad en ROB.

Legal sources, all wetten.overheid.nl, all 18-09-2026: BWBR0002367 (Wet op de Raad van State), BWBR0001840 (Grondwet), BWBR0039429 (Comptabiliteitswet 2016), BWBR0003372 (Wet Nationale ombudsman), BWBR0004627 (Kieswet), BWBR0002058 (Wet op de SER), BWBR0003043 (Instellingswet W.R.R.), BWBR0031263 (Wet Rli), BWBR0008419 (Wet op de ROB), BWBR0008683 (Wet op de Onderwijsraad), BWBR0002202 (Gezondheidswet), BWBR0035852 (Wet op de RVS), BWBR0009474 (Wet op de AIV), BWBR0011823 (Vreemdelingenwet 2000), BWBR0008159 (Kaderwet adviescolleges), BWBR0035175 (Wet AWTI) en BWBR0031972 (Aanwijzingen voor de Planbureaus).

## Decisions

1. Subtypes used: `hoge-college` for Raad van State, Algemene Rekenkamer en Nationale ombudsman; `adviescollege` for SER, WRR, Rli, ROB, Onderwijsraad, Gezondheidsraad, RVS, AIV, Adviesraad Migratie en AWTI; `planbureau` for CPB, PBL en SCP; `kiesraad` for de Kiesraad. The Kiesraad and the planbureaus sit under `branch: adviescolleges`; the three Hoge Colleges under `branch: hoge-colleges`. Alternative not taken: putting the Kiesraad under `hoge-colleges`, which would misstate its character.
2. ACVZ en Adviesraad Migratie are one body. Modeled as one organization, `org:adviesraad-migratie`, with `ACVZ` and `Adviescommissie voor Vreemdelingenzaken` as aliases and `established: 2001-04-01`. Alternative not taken: a separate dissolved ACVZ organization with a `succeeded_by` edge, which needs a rename date that no source publishes.
3. The Raad van State head is the vice-president, not the Koning. The Grondwet makes the Koning voorzitter (workstream A); the vice-president has the daily leiding. Alternative not taken: recording the Koning as head here, which would duplicate workstream A.
4. Eerste en Tweede Kamer are cross-referenced to workstream D and not duplicated. Alternative not taken: re-creating the two Kamers in this file.
5. `parent` is set only where the body is an organizational part of a ministerie: Kiesraad (BZK), Adviesraad Migratie (J&V), CPB (EZK), PBL (IenW) en SCP (VWS). The independent adviescolleges have `parent: null` and an `advises` edge to the coordinating ministry. Alternative not taken: setting `parent` to the coordinating ministry for every body per the contactgids, which would wrongly suggest hierarchy for independent colleges.
6. `advises` targets: Rli to IenW, EZK, LVVN en BZK (all four are named in the Rijksoverheid appointment release); ROB en Kiesraad to BZK; Onderwijsraad to OCW; Gezondheidsraad en RVS to VWS; AIV to BZ; Adviesraad Migratie to J&V; SER to SZW en EZK; AWTI to OCW en EZK; CPB to EZK; PBL to IenW; SCP to VWS; WRR to de regering; Raad van State to de regering. Where the specific ministry is not printed on the body page, the edge carries confidence `medium` and cites the contactgids or instellingswet.
7. Date policy. An exact date is stored when a source prints one. Where only a year or month is published, the tenure start is set to the first day of that period and marked confidence `low`, with a gap naming the missing precision. This applies to Corien Prins (2017), Bert Koenders (13 december 2021, medium, from a university timeline) en Monique Kremer (maart 2024). Alternative not taken: dropping the tenure, which would break the head-to-position link the product needs.
8. Persoonsgeboortedata zijn `null` gelaten. Ze zijn voor deze workstroom niet nodig en niet uit de geciteerde bronnen te halen. Alternative not taken: overnemen uit parlement.com of Wikipedia, wat buiten de bronopdracht valt.
9. `rob-rfv.nl` is in 2026 een commerciele blog en niet de ROB. De ROB staat op `raadopenbaarbestuur.nl`. Alternative not taken: de URL uit `00-endpoints.md` blijven gebruiken.
10. `acvz.nl` is in 2026 de Amsterdamsche Club voor Zweefvliegen en niet de ACVZ. De Adviesraad Migratie staat op `adviesraadmigratie.nl`. Alternative not taken: `acvz.nl` als ACVZ-bron citeren.
11. Alle geciteerde bronnen zijn gededupliceerd als `src:`-records; elke entiteit verwijst met een sourceRef en confidence.

## Gaps

Mirrors the `gaps` array in the JSON.

1. Raad van State website en instellingspagina's. `raadvanstate.nl` geeft HTTP 403 aan geautomatiseerde fetch. De kop is daarom bevestigd via de Rijksoverheid-publicatie. Endpoint: https://www.raadvanstate.nl/. Resume: primaire bekendmaking via repository-SRU of zoek.officielebekendmakingen.nl.
2. Exacte startdatum WRR-voorzitterschap Corien Prins. Alleen het jaar 2017 is gepubliceerd. Endpoint: https://www.wrr.nl/personen/raad-en-adviserende-leden/corien-prins. Resume: koninklijk besluit in de Staatscourant.
3. Exacte benoemingsdatum AIV-voorzitter Bert Koenders. Alleen de universitaire tijdlijn noemt 13 december 2021. Endpoint: https://www.adviesraadinternationalevraagstukken.nl/personen/adviesraad/bert-koenders. Resume: KB of jaarverslag 2021.
4. Exacte startdatum huidige termijn Monique Kremer. Alleen maart 2024 is gepubliceerd. Endpoint: https://www.adviesraadmigratie.nl/personen/monique-kremer. Resume: bekendmaking van de herbenoeming in 2024.
5. Datum van de naamswijziging ACVZ naar Adviesraad Migratie. Niet gepubliceerd op de geraadpleegde pagina's. Endpoint: https://organisaties.overheid.nl/115625/Adviesraad_Migratie. Resume: Staatscourant of jaarverslag.
6. Vervallen domein `rob-rfv.nl`. Endpoint: https://www.raadopenbaarbestuur.nl/. Resume: `00-endpoints.md` bijwerken.
7. Vervallen domein `acvz.nl`. Endpoint: https://www.adviesraadmigratie.nl/. Resume: `00-endpoints.md` bijwerken.
8. Benoemingswijze planbureaudirecteuren. Niet op de sites van CPB, PBL en SCP. Endpoint: https://wetten.overheid.nl/BWBR0031972. Resume: Aanwijzingen en organisatiebesluiten lezen.
9. Artikelniveau juridische basis per orgaan. Werkterrein van workstream H. Endpoint: https://wetten.overheid.nl/BWBR0008159. Resume: workstream H vult `legalMappings` aan.
10. Volledige raadsledenlijsten. Alleen kop-posities zijn uitgewerkt. Endpoint: https://www.wrr.nl/over-de-wrr/raad-en-adviserende-leden. Resume: leden toevoegen als posities of memberships met bron en datum.
11. Eerste en Tweede Kamer niet gedupliceerd. Kruisverwijzing naar workstream D. Endpoint: research/D-parlement.json. Resume: bestaande org-ids uit D gebruiken.

## Open questions

- Which ministerie is de coordinating ministry for the SER? The Rijksoverheid contactgids says EZK, while the sociaal-economische portefeuille historically sits with SZW. Best placed to answer: the orchestrator, with workstream A.
- Should the Kinderombudsman and Veteranenombudsman be separate organizations or positions under the Nationale ombudsman? `wie-is-de-nationale-ombudsman` names Margrite Kalverboer as Kinderombudsman en substituut-ombudsman. Best placed to answer: the orchestrator, with workstream A.
- Should the AIV's four permanente commissies (CEI, CIO, CMR, CVV) be modeled as commissions with their own chairs? The person pages name chairs per commissie. Best placed to answer: the orchestrator, against `docs/03` section 4.
- Is the Kiesraad a `kiesraad` subtype with `branch: adviescolleges`, or does it need its own branch for the verkiezingsautoriteit role? Best placed to answer: the orchestrator, as a schema question for `docs/04`.
- The planbureaus share the Aanwijzingen voor de Planbureaus as legal base. Workstream H should decide whether to assign the same legalSource to all three or add per-bureau organisation decisions. Best placed to answer: workstream H.
