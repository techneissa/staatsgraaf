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
| Organizations | 42 (39 samenwerkingsverbanden, 3 land-regering) |
| Positions | 6 (3 gouverneur, 3 gevolmachtigde minister) |
| People | 7 |
| Tenures | 8 |
| Sources | 51 |
| Gaps | 4 |

Dataset totals after merge: 1614 organisations, 1434 positions, 875 people.

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

## Ordered plan for the next Phase 7 cycles

1. **Chamber depth**: committees and their members from the TK OData source already in use; votes and kamerstukken stay out until membership is complete (ADR 0006 defers them).
2. **Unfilled seats**: fill the elected bodies (gemeenteraden, provinciale staten, waterschapsbesturen) from KOOP and municipality records; this is the largest headcount jump and needs a nightly-friendly source.
3. **Kingdom breadth**: eilandsraden of Aruba, Curaçao and Sint Maarten, ministers and ministries of the three landen, on the same schema.
4. **Historical dimension**: tenures and kabinetten back through time for a timeline scrubber.
5. **Public API and bulk downloads** for researchers and journalists.
6. **Swift app** (already planned as the iOS phase) once the contract stabilises.
