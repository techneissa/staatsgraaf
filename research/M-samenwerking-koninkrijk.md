# Workstream M, Samenwerking en Koninkrijk: GGD'en, omgevingsdiensten, koepels, landen

## Scope covered

Expansion wave 1 of Phase 7, in this order:

1. The regionale samenwerkingsorganen that were still missing: 15 GGD-type organisations and 24 omgevingsdiensten, all from the KOOP register of regionale samenwerkingsorganen.
2. The Kingdom countries Aruba, Curaçao and Sint Maarten as organisations on the same schema, each with a gouverneur and a gevolmachtigde minister position and dated tenures.
3. The scheduled data gaps D-15 and D-16, fixed in workstream G's file.
4. Verification of the koepels VNG, IPO and UvW, which were already modelled.

## Counts produced

| Entity | Count |
| --- | --- |
| Organizations | 69 (39 samenwerkingsverbanden, 3 land-regering, 3 landstaten, 24 ministeries) |
| Positions | 39 (3 gouverneur, 3 gevolmachtigde minister, 3 statenlid, 3 voorzitter staten, 3 minister-president, 24 minister) |
| People | 12 |
| Tenures | 13 |
| Relations | 30 (24 part_of, 3 oversees, 3 dept_head) |
| Sources | 71 |
| Gaps | 8 |

Dataset totals after the wave 1 merge: 1614 organisations, 1434 positions, 875 people. This section's counts are before the next merge run.

## Sources fetched with dates

All retrieved 19-09-2026. Raw caches under `research/raw/R/`.

| Source | URL | Yield |
| --- | --- | --- |
| KOOP register regionale samenwerkingsorganen, A-Z | https://organisaties.overheid.nl/Regionale_samenwerkingsorganen/A-Z/1 | All 356 samenwerkingsorganen; 18 GGD-type entries, 24 omgevingsdiensten |
| Wet publieke gezondheid | https://wetten.overheid.nl/BWBR0024705 | Art. 14: regionale gezondheidsdienst via gemeenschappelijke regeling, openbaar lichaam "gemeentelijke gezondheidsdienst" |
| Omgevingswet | https://wetten.overheid.nl/BWBR0037885 | Art. 18.21: omgevingsdienst als openbaar lichaam onder de Wgr |
| Statuut voor het Koninkrijk | https://wetten.overheid.nl/BWBR0002154 | Art. 1 landen; art. 7 en art. 8 gevolmachtigde ministers |
| Rijkswet gouverneur Aruba | https://wetten.overheid.nl/BWBR0003900 | Gouverneur bij koninklijk besluit, zes jaar, eenmaal herbenoembaar |
| Reglement gouverneur Curaçao | https://wetten.overheid.nl/BWBR0028105 | Idem; ontstaansbron Stb. 2010, 341 |
| Reglement gouverneur Sint Maarten | https://wetten.overheid.nl/BWBR0028096 | Idem (Stb. 2010, 342 is a zeegrens treaty, not this reglement) |
| Gouverneur Aruba | https://www.gouverneuraruba.com/gouverneur/gouverneur-boekhoudt | Alfonso Boekhoudt, in functie sinds 01-01-2017, herbenoemd per 01-01-2023 |
| Gouverneur Curaçao | https://www.gouverneurcuracao.com/ + rijksoverheid.nl benoemingsbericht 30-06-2025 + koninklijkhuis.nl beëdigingsbericht 29-10-2025 | Mauritsz de Kort volgt Lucille George-Wout op, ingang 04-11-2025 |
| Gouverneur Sint Maarten | https://www.kabgsxm.com/about-the-governor.aspx?language=NL | Ajamu Baly, ingang 10-10-2022 |
| Kabinet Aruba | https://www.kabinetaruba.nl/nieuws/05/03/2026/mildred-milly-schwengle-benoemd-als-gevolmachtigde-minister-in-nederland | Mildred Schwengle benoemd 04-03-2026 |
| Kabinet Curaçao (via kabinetaruba.nl bericht 18-08-2026) | https://www.kabinetaruba.nl/nieuws/18/08/2026/gevolmachtigde-minister-van-curacao-op-bezoek-bij-minister-schwengle | Sidney Justiana benoemd 01-07-2026 |
| Sint Maarten cabinet | https://www.sintmaartengov.org/news/pages/Minister-Plenipotentiary-2025-Marked-a-Pivotal-Moment-in-Shaping-the-Future-Direction-of-the-Cabinet.aspx | Gracita Arrindell appointed 26-11-2024 |
| Waterschapswet | https://wetten.overheid.nl/BWBR0005108 | Art. 10 en art. 46: dijkgraaf is voorzitter, benoemd bij koninklijk besluit voor zes jaar (gap D-15 fix) |
| Rijksoverheid, nieuwe burgemeester Culemborg | https://www.rijksoverheid.nl/actueel/nieuws/2025/11/13/nieuwe-burgemeester-in-culemborg | Marinka Mulder per 03-12-2025; Gerard Renkema waarnemend (gap D-16 fix) |

## Decisions

- GGD'en and omgevingsdiensten are organisations with `subtype: samenwerkingsverband`, `level: regionaal`, `branch: decentraal-lokaal`, legal basis "Wet publieke gezondheid art. 14" resp. "Omgevingswet art. 18.21". No boards, no member municipalities. See ADR 0013.
- VGGM and VRLN are not new organisations: they are aliases on the existing veiligheidsregio records, added through the envelope-level aliases collection.
- The Kingdom countries are `subtype: land-regering`, `level: koninkrijk`, `branch: koninkrijk`, with `country` aruba, curacao, sint-maarten. Gouverneur positions use `fillMethod: koninklijk-besluit`, `termLengthMonths: 72`; gevolmachtigde-minister positions use `benoeming-door-college` with legal basis "Statuut voor het Koninkrijk art. 7 en art. 8".
- George-Wout's first term start 04-11-2013 is derived from two six-year terms ending 04-11-2025; confidence medium, derivation noted on the tenure.
- The earlier waarnemend burgemeester chain in Culemborg (Geurts, van Grootheest) is not modelled; the recorded tenure chain starts with Renkema.
- Omgevingsdiensten get no English gloss in `web/lib/name-gloss.ts` (no established English name exists); GGD-pattern names gloss to the official "Municipal Health Service X".

## Gaps

1. Nine GGD-regio's have no separate KOOP entry because the GGD task is embedded in the veiligheidsregio organisation (Fryslân, Drenthe, Twente, Hollands Midden, Kennemerland, NHN, ZHZ and others). Not modelled as separate organisations.
2. Boards and member municipalities of GGD'en and omgevingsdiensten are not modelled.
3. The waarnemend chain before Renkema in Culemborg (Jaco Geurts, Gerdo van Grootheest) is not modelled.
4. The Sint Maarten governor site exists under both kabgsxm.com and governorsintmaarten.com; the canonical domain is not confirmed.

## Kingdom breadth extension, 19-09-2026

The three landstaten and the 24 landen-ministeries are modelled, so the three landen stop being satellite-only organs.

### Organisations added

- `org:staten-aruba` (Staten van Aruba, alias Parlamento di Aruba), 21 zetels: AVP 9, MEP 8, FUTURO Aruba 3, PPA 1 per de Staten-zelf op iBabs. Type `elected`, subtype `staten-land`, branch `koninkrijk`, level `koninkrijk`, country `aruba`. Website https://www.parlamento.aw/. Retrieved 19-09-2026, high (gobierno.aw statenpagina + iBabs); 21-zetels-telling high.
- `org:staten-curacao` (Staten van Curaçao, alias Parlamento di Kòrsou), 21 leden, gekozen 21-03-2025 (Electorale Raad kse.cw, search excerpt), geïnstalleerd 11-05-2025; samenstelling MFK 13, PNP 4, PAR 2, MAN 2. Website https://www.parlamento.cw/ (let op: nl.wikipedia noemde "parlemento.cw", dat is een verkeerd domein). Established 10-10-2010, medium.
- `org:staten-sint-maarten` (Staten van Sint Maarten, alias Parliament of Sint Maarten), 15 gekozen leden, opgericht 10-10-2010. Website https://sxmparliament.org/. Established 10-10-2010, high.
- 8 Arubaanse ministeries (namen exact van https://www.gobierno.aw/nl/ministeries), rechtsgrond "Landsverordening instelling ministeries 2022 (AB 2022 no. 18)" via https://www.gobierno.aw/nl/0103-ministers (wijzigingen 2016 no. 76; 2018 no. 22).
- 9 Curaçaoanse ministeries (namen van https://gobiernu.cw/nl/ministeries/; ampersands behouden). De namen krijgen "(Curaçao)" als disambiguatie, omdat "Ministerie van Financiën" anders gelijkstaat aan het Nederlandse ministerie.
- 7 Sint Maarten ministeries met officiële Engelse namen van https://www.sintmaartengov.org/Ministries/Pages/Ministries.aspx (site is Engels; namen ongewijzigd overgenomen).

Alle ministeries: type `department`, subtype `ministerie`, branch `koninkrijk`, level `koninkrijk`, country per land.

### Positions, people, tenures

- `pos:statenlid-<land>` (elected, verkiezing, gekozen, 21/21/15 zetels, legal basis Statuut art. 46). Term 48 maanden alleen voor Aruba (gobierno.aw: leden gekozen voor 4 jaar); voor Curaçao en Sint Maarten geen officiële termlength gefetched, dus null.
- `pos:voorzitter-staten-<land>` (dept_head, benoeming-door-college). Legal basis alleen voor Curaçao (nombramentu-pagina).
- `pos:minister-president-<land>` op `org:regering-<land>` (dept_head, benoeming-door-college). Term 48 maanden alleen Aruba (gobierno.aw: "De ministers worden benoemd door de Staten voor dezelfde periode als de zittingsduur van de Staten"; maximaal negen ministers per Staatsregeling).
- 24 ministerposities op de 24 ministerieorganen; `fillMethod: benoeming-door-college`, entryMode `benoemd`. Alle 24 plus de Sint Maarten minister-presidentschap staan leeg (zie gaps).
- Voorzitters gemodelleerd: Alfred M. Sneek (alias Marlon Sneek, AVP) start 27-03-2025 (wikipedia, medium; identiteit high via iBabs); Fergino Brownbill (MFK) start 11-05-2025 (wikipedia, medium; identiteit high via parlamento.cw); Sarah A. Wescot-Williams (DP) start 10-02-2024 (wikipedia, medium; identiteit high via presidium-pagina).
- Minister-presidenten: Mike Eman (Michiel Godfried Eman) start 28-03-2025, kabinet AVP-Futuro (gobierno.aw samenstelling, high); Gilmar Pisas start 09-06-2025, kabinet-Pisas III (wikipedia, medium).

### Relations and conventions

- Elk ministerie krijgt `part_of` naar `org:regering-<land>` (24 relaties). Nederlandse ministeries hebben dit niet (ze hangen onder geen aparte regering-organisatie); dit is een landniveau-conventie voor dit werkstream.
- Elke statenorganisatie krijgt `oversees` naar `org:regering-<land>` (3 relaties), elk met een eigen officiële bron: gobierno.aw samenstelling ("beleid gecontroleerd door de Staten"), parlamento.cw ("kontrolá i eksigí responsabilidat for di Gobièrnu"), sxmparliament.org/about ("Parliament exercises oversight of the Government"). `accountable_to` wordt niet gebruikt (nul precedent in data).
- Elk voorzitterschap krijgt een `dept_head`-relatie van positie naar statenorganisatie (precedent: voorzitter Tweede Kamer).

### Gaps added (4, totaal nu 8)

1. Aruba: zes ministers naast de minister-president niet als personen met tenuren gemodelleerd; portefeuille-ministerie-mapping is onduidelijk (menu-slugs verouderd). Endpoint https://www.gobierno.aw/nl/samenstelling-0.
2. Curaçao: ministers niet gemodelleerd; geen officiële samenstellingspagina gefetched. Endpoint https://gobiernu.cw/nl/ministeries/.
3. Sint Maarten: ministers en de tenure van PM Luc F.E. Mercelina niet gemodelleerd. Endpoint Ministries.aspx + per-ministry pagina's.
4. Statenleden van de drie landen niet als leden gemodelleerd; startdatum voorzitterschap Wescot-Williams (10-02-2024) is alleen via Wikipedia (medium) bekend.

All sources and endpoints are recorded with retrieval date 19-09-2026 in `research/M-samenwerking-koninkrijk.json` (20 new sources, 20 new endpoint entries).

## Ordered plan for the next Phase 7 cycles

1. **Chamber depth**: committees and their members from the TK OData source already in use; votes and kamerstukken stay out until membership is complete (ADR 0006 defers them).
2. **Unfilled seats**: fill the elected bodies (gemeenteraden, provinciale staten, waterschapsbesturen) from KOOP and municipality records; this is the largest headcount jump and needs a nightly-friendly source.
3. **Kingdom breadth** (partly done 19-09-2026): landstaten, BES-eilandsraden and landen-ministeries are modelled; remaining are the ministers and the Statenlid membership of the three landen (see gaps above).
4. **Historical dimension**: tenures and kabinetten back through time for a timeline scrubber.
5. **Public API and bulk downloads** for researchers and journalists.
6. **Swift app** (already planned as the iOS phase) once the contract stabilises.
