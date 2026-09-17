# Workstream I: Personen en benoemingen

## Scope covered

This workstream adds the person and tenure layer on top of the positions of workstreams A to G. It does not repeat the current open tenures those workstreams already produced. It adds three things:

1. The current fractievoorzitters of the Tweede Kamer and their predecessor chains, back to the verkiezingen of 22 november 2023. Workstream D left all 17 fractievoorzitter positions holderless; this workstream fills them from the Tweede Kamer OData API.
2. Predecessor chains for five bewindspersonen positions where a source states both the start and the end date.
3. Named gaps for the positions A to G left holderless and for the predecessor start dates that no reachable source states.

Counts in the envelope: 12 people, 45 tenures (17 open, 28 closed), 22 distinct positions, 21 sources, 43 gaps. Four further sources (the Staatscourant KB's 8174, 8175, 8178 and 8740) are declared by workstream A; this file reuses those `src:` ids and does not redeclare them, so the merge has no duplicate source record.

The boundary against the neighbouring workstreams: A to G own the organizations and positions and their current tenures; this workstream references those position ids and person ids exactly as produced, and owns only the tenure records it adds and the person records for people who appear nowhere in A to G.

Coverage across the merged set after this workstream: 1431 positions, 548 with exactly one open tenure, 39 multi-seat positions with more than one open tenure, 844 without a tenure. Of the 844, 756 are the seat-class positions of workstream G (raadslid, statenlid, wethouder, gedeputeerde), 33 are Eerste Kamer committee and griffier positions, 2 are the seat-class positions lid-tweede-kamer and lid-eerste-kamer, and the rest are the 16 SG and DG positions of A, the 35 service-head positions of B and several others. Every one of these is named as a gap below or in the gap list of its own workstream.

## Sources fetched with dates

All fetched 2026-09-18. Raw snapshots are under `research/raw/I/`.

| Source | URL | Retrieved | What it yielded |
| --- | --- | --- | --- |
| Tweede Kamer OData, FractieZetelPersoon | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/FractieZetelPersoon | 2026-09-18 | 1236 records; per zetelhouder the functie (Lid of Fractievoorzitter) with Van and TotEnMet. Primary source for the fractievoorzitter chains. |
| Tweede Kamer OData, Fractie | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Fractie | 2026-09-18 | Fractienamen en afkortingen, to map to the D position ids. |
| Tweede Kamer OData, FractieZetel | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/FractieZetel | 2026-09-18 | Koppeling zetel aan fractie. |
| Tweede Kamer OData, Persoon | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Persoon | 2026-09-18 | 4474 records; name data of (oud-)Kamerleden. |
| Tweede Kamer OData, PersoonLoopbaan | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/PersoonLoopbaan | 2026-09-18 | 2000 records; personal career lines. Fetched and assessed but not used, see Decisions. |
| Tweede Kamer OData, metadata | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/$metadata | 2026-09-18 | Field lists for the entities above. |
| Staatscourant 2026, 8174 (XML) | https://www.officielebekendmakingen.nl/stcrt-2026-8174.xml | 2026-09-18 | Ontslag H.W.M. Schoof als Minister-President; benoeming R.A.A. Jetten. |
| Staatscourant 2026, 8175 (XML) | https://www.officielebekendmakingen.nl/stcrt-2026-8175.xml | 2026-09-18 | Ontslag van negen ministers en van alle staatssecretarissen per 23 februari 2026. |
| Staatscourant 2026, 8178 (XML) | https://www.officielebekendmakingen.nl/stcrt-2026-8178.xml | 2026-09-18 | Niet-verlening ontslag aan vier ministers; herindeling van portefeuilles. |
| Staatscourant 2026, 8740 (XML) | https://www.officielebekendmakingen.nl/stcrt-2026-8740.xml | 2026-09-18 | Directeur Kabinet van de Koning: ontslag C. Jonker, benoeming waarnemend directeur F.J.J. Princen. |
| Kamerstuk 36471-72, bijlage blg-1151692 | https://zoek.officielebekendmakingen.nl/blg-1151692.html | 2026-09-18 | De KB-afschriften van 2 juli 2024 met de benoemingen van het kabinet-Schoof; source for the five predecessor start dates. PDF: https://repository.overheid.nl/frbr/officielepublicaties/blg/onopgemaakt/blg-1151692/1/pdf/blg-1151692.pdf |
| Eerste Kamer committee pages (16) | https://www.eerstekamer.nl/commissies/{biza,bdo_3,digi,euza,ez_kgg,fin,geloofsbrieven,i_a_jbz,i_w_vro,j_v,korel,lnv,ocw,szw,verzoekschriften,vws} | 2026-09-18 | Voorzitter and ondervoorzitter per vaste commissie; no benoemingsdatum. |
| Gemeente Nuenen | https://www.nuenen.nl/ | 2026-09-18 | JavaScript-app, no readable burgemeester page. |
| Gemeente Zwartewaterland | https://www.zwartewaterland.nl/ | 2026-09-18 | JavaScript-app, no readable burgemeester page. |
| repository.overheid.nl SRU | https://repository.overheid.nl/sru | 2026-09-18 | Searched for benoemings-KB's of the ambtelijke posten and the outgoing bewindspersonen; no matching appointment KB found. |

## Decisions

1. **No duplication of current tenures.** A to G already carry one open tenure for 531 positions. This workstream does not re-emit them. It emits only the 17 missing fractievoorzitter tenures, the predecessor tenures and the gaps. The alternative, copying every current tenure into this file, would create duplicate ids at the merge.
2. **Exact ids reused.** Position ids come from D and A unchanged. Person ids come from A to G where the person already exists. The five minister predecessor tenures reuse the id of the current holder as `successor` (for example `tenure:minister-president-rob-jetten`), so the merge can join the chain.
3. **Predecessor link direction.** For the five minister chains the link is stored as `successor` on the older tenure, pointing to the current tenure owned by A. The reverse `predecessor` field on the current tenure cannot be set here because one writer owns each file and this workstream may not edit A. The merge should mirror `successor` into the matching `predecessor`.
4. **Fractievoorzitters sourced from the TK OData API.** `FractieZetelPersoon` is machine-readable and carries both `Van` and `TotEnMet` per fractievoorzitter. `entryMode` is `gekozen` because the fractie chooses its voorzitter; `endReason` is `aftreden` for a segment that ended before 2026-09-18. The alternative, scraping the Tweede Kamer member pages, would give names but not dated segments.
5. **Fractie renames kept continuous.** `PRO` is the successor name of `GroenLinks-PvdA` in the Fractie table. The chain for `pos:fractievoorzitter-pro` therefore includes the GroenLinks-PvdA segments of the same persons. The alternative, treating PRO as a brand-new position with no predecessor, would break a chain that the source states continuously (Jesse Klaver appears in both).
6. **Fragmented 50PLUS fractie ids merged into one chain.** The Fractie table carries `50PLUS`, `50PLUS/Klein` and `50PLUS/Baay-Timmerman` as separate ids for the same party. All three are mapped to `pos:fractievoorzitter-50plus`. The alternative, one position per fractie id, would create three positions for one party.
7. **Only five bewindspersonen predecessor chains are created.** The ontslag-KB's (8174, 8175, 8178) name the outgoing holder and the end date 23 februari 2026 but never the start date. Only for the PM, Defensie, Landbouw (LVVN), Klimaat en Groene Groei and Volkshuisvesting en Ruimtelijke Ordening does the kabinet-Schoof KB of 2 juli 2024 state both the person and the start date 2024-07-02. For every other outgoing bewindspersoon the start date is recorded as a gap. The alternative, using 2024-07-02 for all of them, is not supported: the 2026 ontslag-KB names different holders for several portfolios than the 2024 benoemings-KB.
8. **One person, many tenures.** The following people now carry more than one tenure across the merged set and share a single id: R.P. Brekelmans (Defensie predecessor and VVD fractievoorzitter), M.C.G. Keijzer (VRO predecessor and fractievoorzitter Lid Keijzer), S.Th.M. Hermans (KGG predecessor and Minister van VWS) and R.A.A. Jetten (D66 fractievoorzitter and Minister-president). Alternate name forms were mapped to the existing ids explicitly (see the alias table in the generator).
9. **Nine person ids are produced by two workstreams** (A and C, B and C, B and E, C and F, C and G, D and G). In every case both files independently chose the same id, so the merge deduplicates by id without a conflict. Apart from the three same-name G pairs in decision 10, no case was found of the same person under two different ids.
10. **The G suffix persons are not merged.** `person:marjan-van-kampen-nouwen` and `...-schagen`, `person:wendy-verkleij-eimers` and `...-noordwijk`, `person:jose-van-egmond` and `...-tiel` share a name and each hold an open burgemeester tenure. The slug disambiguator suggests G treated them as namesakes. This workstream does not merge them without a source. See Open questions.
11. **G seat-class positions are not given individual tenures.** The 378 raadslid and statenlid positions and the 378 wethouder and gedeputeerde positions model a body with many seats, not one officeholder. They belong to the membership model (`seatsCount` plus a membership per person) and are recorded as gaps. The alternative, one tenure per officeholder, is deferred to the decentrale phase.
12. **`lid-tweede-kamer` and `lid-eerste-kamer` are seat classes.** D already covers them with 225 memberships. They are not given tenures here.
13. **Eerste Kamer committee chairs are gaps, not invented tenures.** The committee pages publish the holder but not the start date. A tenure without a sourced start date is not created. The holder names are recorded inside the gap so the fact is not lost.
14. **No year-only date was invented.** Every tenure added here has a day-precise start from its source. Where only a year or no date exists, a gap was recorded instead.

## Gaps

The JSON `gaps` array carries 43 entries with `what`, `why`, `endpoint` and `resume`. Grouped:

- **Bewindspersonen predecessor start dates, 19 entries.** For 17 named outgoing holders (16 bewindspersonen and the directeur Kabinet van de Koning, C. Jonker) the ontslag-KB gives the name and 2026-02-23 but no start date. The other 2 entries cover staatssecretaris positions where the ontslag-KB names no direct predecessor. Endpoint: https://www.officielebekendmakingen.nl/stcrt-2026-8175 and the Kamerstukken on the kabinetsformatie.
- **Eerste Kamer committee chairs and vice-chairs, 16 entries.** One per vaste commissie, naming the voorzitter and ondervoorzitter found on the committee page but not their benoemingsdatum. Endpoint: the committee page, plus https://www.eerstekamer.nl/personele_mutaties for the mutation date.
- **Griffier Eerste Kamer, 1 entry.** The personele-mutaties page announces the vertrek per 21 augustus 2026 without a name or successor. Endpoint: https://www.eerstekamer.nl/personele_mutaties.
- **Fractievoorzitter history before 2023-12-06, 1 entry.** The chains here stop at the segment that overlaps the verkiezingen of 22 november 2023 plus one predecessor. Endpoint: the TK OData FractieZetelPersoon set.
- **A SG and DG start dates, 1 consolidated entry** naming the 16 ambtelijke functionarissen. Workstream A recorded the same gap as gap 4. Endpoint: https://www.officielebekendmakingen.nl/.
- **B service-head start dates, 1 consolidated entry** covering the 35 positions B left without a tenure. Endpoint: https://organisaties.overheid.nl/ and the Staatscourant.
- **G seat classes, 2 entries** for the 378 raadslid and statenlid positions and the 378 wethouder and gedeputeerde positions. Endpoint: https://openraadsinformatie.nl/ and https://www.kiesraad.nl/verkiezingen.
- **G missing burgemeesters, 2 entries** for Nuenen, Gerwen en Nederwetten and for Zwartewaterland. Endpoint: the gemeente site and https://www.officielebekendmakingen.nl/.

## Open questions

- Are `person:marjan-van-kampen-nouwen` and `person:marjan-van-kampen-nouwen-schagen` (and the Verkleij-Eimers and Van Egmond pairs) the same person who moved between gemeenten, or namesakes? Best answered by workstream G or the orchestrator from a gemeente page or a benoemings-KB. It affects three open burgemeester tenures.
- Which person is the immediate predecessor on `pos:minister-van-asiel-en-migratie`? Staatscourant 8175 names M.C.G. Keijzer as Minister voor Asiel en Migratie and 8178 names D.M. van Weel as Minister van Asiel en Migratie for the same outgoing period. Best answered by the orchestrator from the full kabinet-Schoof benoemingsreeks.
- For several portfolios the kabinet-Schoof KB of 2 juli 2024 names a different holder than the 2026 ontslag-KB. Can the mid-term benoemings-KB's between 2024-07-02 and 2026-02-23 be found in the Staatscourant or the Kamerstukken? Best answered by a follow-up of this workstream.
- Should the decentrale seat classes be filled with memberships in a later phase, and if so, from `openraadsinformatie.nl` or from each raadsinformatiesysteem? Owner decision, affects workstream G and the schema.
- Does the griffier of the Eerste Kamer belong in the position model at all, given that the Eerste Kamer treats it as an ambtelijke functie and not a political office? Owner decision.
