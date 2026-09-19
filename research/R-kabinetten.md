# Workstream R: kabinetten sinds 1945

- Gegenereerd: 19-09-2026
- Bron: de Rijksoverheid-pagina "Kabinetten sinds 1945" met de 32 per-kabinetpagina's (confidence high), aangevuld met parlement.com (PDC, confidence medium) voor zetelaantallen, kabinetstypen, ontslagdata die de Rijksoverheid niet noemt, en de partijbasis van het kabinet-Schermerhorn-Drees.
- Werkwijze: fetch, nooit uit het geheugen. Elke datum komt van een opgehaalde pagina; bij verschil tussen de bronnen wint de Rijksoverheid en staat de afwijking van parlement.com in notes. Wikipedia is nergens gebruikt. verkiezingsuitslagen.nl is niet bereikbaar uit deze sandbox en niet geprobeerd.
- Bestanden: `research/R-kabinetten.json` (envelop met `coalitions`, `sources`, `gaps`) en dit rapport.

## Endpoints

| Bron | URL | Opgehaald | Status |
| --- | --- | --- | --- |
| Rijksoverheid, kabinetten sinds 1945 (overzicht) | https://www.rijksoverheid.nl/regering/over-de-regering/kabinetten-sinds-1945 | 19-09-2026 | 200 |
| Rijksoverheid, 32 per-kabinetpagina's (`.../kabinetten-sinds-1945/kabinet-<slug>`, van kabinet-jetten tot kabinet-schermerhorn-drees) | zie `endpointsUsed` in de JSON | 19-09-2026 | 32 x 200 |
| Rijksoverheid, regeerakkoord 2026 "Aan de slag: Bouwen aan een beter Nederland" | https://www.rijksoverheid.nl/documenten/2026/01/30/aan-de-slag-bouwen-aan-een-beter-nederland | 19-09-2026 | 200 |
| Rijksoverheid, coalitieakkoord 2022 | https://www.rijksoverheid.nl/documenten/2022/01/10/coalitieakkoord-omzien-naar-elkaar-vooruitkijken-naar-de-toekomst | 19-09-2026 | gelinkt vanaf kabinetspagina |
| Rijksoverheid, regeerakkoord 2017 | https://www.rijksoverheid.nl/documenten/2017/10/10/regeerakkoord-2017-vertrouwen-in-de-toekomst | 19-09-2026 | gelinkt vanaf kabinetspagina |
| Rijksoverheid, regeerakkoord 2012 | https://www.rijksoverheid.nl/documenten/2012/10/29/regeerakkoord | 19-09-2026 | gelinkt vanaf kabinetspagina |
| Rijksoverheid, regeerakkoord 2010 | https://www.rijksoverheid.nl/documenten/2010/09/30/regeerakkoord-vvd-cda | 19-09-2026 | gelinkt vanaf kabinetspagina |
| Rijksoverheid, coalitieakkoord 2007 | https://www.rijksoverheid.nl/documenten/2007/02/07/coalitieakkoord-balkenende-iv | 19-09-2026 | gelinkt vanaf kabinetspagina |
| Rijksoverheid, hoofdlijnenakkoord 2024 (documentpagina) | https://www.rijksoverheid.nl/documenten/2024/05/16/hoofdlijnenakkoord-tussen-de-fracties-van-pvv-vvd-nsc-en-bbb en twee varianten | 19-09-2026 | 404 (gap R-1) |
| Rijksoverheid, zoekpagina | https://www.rijksoverheid.nl/zoeken?trefwoord=hoofdlijnenakkoord+PVV+VVD+NSC+BBB | 19-09-2026 | 200, geen resultaten in de HTML |
| Parlement.com, kabinetten 1945-heden | https://www.parlement.com/kabinetten-1945-heden | 19-09-2026 | 200 |
| Parlement.com, 33 kabinetpagina's (`https://www.parlement.com/kabinet-<slug>`) | zie `endpointsUsed` in de JSON | 19-09-2026 | 33 x 200 |
| Parlement.com, hoofdlijnenakkoord 2024 | https://www.parlement.com/hoofdlijnenakkoord-2024 | 19-09-2026 | 200 |
| Parlement.com, opgeheven politieke partijen | https://www.parlement.com/opgeheven-politieke-partijen | 19-09-2026 | 200 |

De oude parlement.com-URL met `/id/vh8lnhrp1x03/...` leidt door naar de nieuwe structuur zonder id; alle bronrecords gebruiken de nieuwe URL.

## Tellingen

- Kabinetten op de Rijksoverheid-pagina: 32, van kabinet-Schermerhorn-Drees (beëdigd 24-06-1945) tot kabinet-Jetten (beëdigd 23-02-2026, zittend).
- Coalitierecords: 36. Dat zijn de 32 kabinetten plus 4 rompkabinetten na het vertrek van een coalitiepartner: kabinet-Schoof twee keer (PVV weg op 03-06-2025, NSC weg op 22-08-2025), kabinet-Balkenende IV (PvdA weg op 23-02-2010) en kabinet-Biesheuvel (DS70 weg op 21-07-1972, record kabinet-Biesheuvel II).
- Kind: 25 meerderheid, 4 minderheid (Jetten, Rutte-Verhagen, Balkenende III, Van Agt III), 4 rompkabinet, 0 zakenkabinet, 3 null (Zijlstra, Beel II, Schermerhorn-Drees).
- Zittend record: 1 (`coalition:kabinet-jetten`, `end: null`, `demissionairSince: null`).
- Records met demissionairSince: 35 van 36. Alleen kabinet-Jetten heeft null.
- primeMinister gevuld: 8 records (Jetten 1, Schoof 3, Rutte 4), 28 null; zie de sectie hieronder.
- agreement gevuld: 10 records (Jetten, de drie Schoof-records, Rutte IV, Rutte III, Rutte-Asscher, Rutte-Verhagen en de twee Balkenende IV-records, die het coalitieakkoord 2007 delen), 26 null.
- Bronrecords: 74 (1 Rijksoverheid-overzicht, 32 Rijksoverheid-kabinetpagina's, 6 Rijksoverheid-akkoorddocumenten, 1 parlement.com-overzicht, 33 parlement.com-kabinetpagina's, 1 parlement.com-hoofdlijnenakkoord 2024, 1 parlement.com-partijenlijst). Elk bronrecord heeft de ophaaldatum 19-09-2026.
- Gaps: 5.
- Confidence: 35 records high, 1 medium (Schermerhorn-Drees).

## Toelichting

- Zittend kabinet. De Rijksoverheid-pagina noemt op 19-09-2026 kabinet-Jetten (D66, VVD, CDA) als zittend kabinet sinds 23-02-2026, met R.A.A. Jetten als minister-president. Het record verwijst naar `person:rob-jetten`, dat in data/people.json bestaat. De opdracht noemde `person:h-w-m-schoof` als zittend minister-president; de bron zegt anders en de bron wint. Schoof staat op de drie Schoof-records.
- Kabinet-Jetten is volgens parlement.com een minderheidskabinet met 66 van 150 zetels (44%); de Rijksoverheid-pagina zegt hier niets over. Nieuwsbronnen die al in data/sources.json staan noemen een kabinetscrisis in september 2026; geen van beide officiële bronnen vermeldt een ontslagaanvraag, dus `end` en `demissionairSince` blijven null (gap R-3).
- Rompkabinetten. Een rompkabinet begint op de dag dat de partner het kabinet verliet en krijgt kind `rompkabinet`. Het gevallen record krijgt `demissionairSince`. Omdat de rompkabinetten van Schoof en Balkenende IV vanaf hun eerste dag demissionair waren, staat daar `demissionairSince` gelijk aan `start`; dat houdt de status op de zetelkaart juist. Kabinet-Biesheuvel II trok de ontslagaanvraag op 09-08-1972 in en werd pas op de verkiezingsdag 29-11-1972 demissionair (parlement.com).
- Schoof: de Rijksoverheid-pagina noemt 03-06-2025 (PVV) en 22-08-2025 (NSC) als data waarop de bewindspersonen van die partijen ontslag aanboden; de vervangers traden op 19-06-2025 en 05-09-2025 aan. De records sluiten en openen op de ontslagdata. Parlement.com noemt in zijn datumtabel 4 juli 2024 als beëdiging maar in de tekst 2 juli 2024; de Rijksoverheid zegt 02-07-2024.
- Balkenende IV: de Rijksoverheid meldt dat Balkenende op 20-02-2010 het ontslag van de PvdA-bewindspersonen aanbood en dat zij op 23-02-2010 aftraden. Het gevallen record heeft `demissionairSince` 20-02-2010 en `end` 23-02-2010; het rompkabinet CDA-ChristenUnie loopt van 23-02-2010 tot 14-10-2010.
- Apart beëdigde vervolgkabinetten zijn geen rompkabinet-records maar eigen kabinetten, zoals de Rijksoverheid ze telt: Balkenende III (CDA-VVD na het vertrek van D66, beëdigd 07-07-2006), Van Agt III (CDA-D66 na het vertrek van de PvdA, beëdigd 29-05-1982), Beel II (KVP-ARP-CHU na het vertrek van de PvdA, beëdigd 22-12-1958) en Zijlstra (KVP-ARP na de val van Cals). Balkenende III en Van Agt III heten bij parlement.com minderheidskabinet en hebben kind `minderheid`; Beel II en Zijlstra heten overgangskabinet, een waarde die de enum niet kent, dus kind null met uitleg in notes.
- Den Uyl is geen rompkabinet: de KVP- en ARP-ministers boden op 22-03-1977 ontslag aan, maar op 28-03-1977 besloot het kabinet als geheel demissionair aan te blijven (Rijksoverheid).
- Rutte-Verhagen (Rutte I) heeft kind `minderheid` (parlement.com); de PVV was gedoogpartner, geen coalitiepartij, en staat niet in `parties`. De val op 23-04-2012 sluit het record zonder rompkabinet.
- Kind `meerderheid` is alleen gezet waar parlement.com een zetelaantal boven de helft van de Kamer geeft; het aantal staat in notes. Voor 1956 had de Tweede Kamer 100 zetels.
- Namen en nummering volgen de Rijksoverheid: Kabinet-Rutte-Verhagen en Kabinet-Rutte-Asscher (parlement.com: Rutte I en II), Kabinet-Drees-Van Schaik, Drees I, II en III (parlement.com: Drees I tot en met IV). De id `coalition:kabinet-drees-van-schaik` gebruikt de juiste spelling; de Rijksoverheid-URL schrijft "schaijk". Voor Biesheuvel gebruikt de Rijksoverheid één naam; de records heten Biesheuvel I en II zoals bij parlement.com.
- Partijvolgorde: volgens het akkoord waar een akkoord is opgehaald (Jetten, Schoof, Rutte IV, Rutte III, Rutte-Asscher, Rutte-Verhagen, Balkenende IV); anders volgens de volgorde waarin parlement.com de coalitie noemt.
- ChristenUnie is als `CU` opgenomen; D'66 als `D66`; het CDA van 1977 (toen nog een federatie) als `CDA`, zoals de Rijksoverheid-pagina doet.
- Datumverschillen tussen de bronnen, telkens beslist voor de Rijksoverheid: beëdiging Schermerhorn-Drees 24-06-1945 (parlement.com 25-06-1945); ontslagaanvraag Rutte-Asscher 14-03-2017 (15-03-2017); Cals 14-10-1966 (15-10-1966); Marijnen 28-02-1965 (27-02-1965); Drees III 12-12-1958 (11-12-1958); Drees-Van Schaik 25-01-1951 (24-01-1951); ontslagaanvraag Biesheuvel 18-07-1972 (22-07-1972).
- Waar de Rijksoverheid alleen "einde van de parlementaire periode" schrijft, komt `demissionairSince` van de datumtabel van parlement.com; dat staat per record in notes.
- Elk record heeft één `source` (de Rijksoverheid-kabinetpagina, high). Feiten uit parlement.com staan in notes met het bron-id, zodat de herkomst per veld leesbaar blijft.
- Het regeerprogramma van het kabinet-Schoof (13-09-2024) is bewust niet als agreement gebruikt: het is de uitwerking van het hoofdlijnenakkoord, niet het akkoord zelf.
- De envelop volgt `shared/output-envelope.schema.json` (bijgewerkt: `workstream` mag nu R zijn en `coalitions` is een toegestane sleutel). Gaps hebben de sleutels what, why, endpoint en resume die het schema vereist; het schema staat geen `id` toe, daarom staan de gap-ids (R-1 tot en met R-5) alleen in dit rapport.

## Partijen buiten het register

Alle namen komen van https://www.parlement.com/opgeheven-politieke-partijen (opgehaald 19-09-2026).

| Sleutel | Volledige naam | Gebruikt in |
| --- | --- | --- |
| KVP | Katholieke Volkspartij | Biesheuvel I en II, Den Uyl, De Jong, Zijlstra, Cals, Marijnen, De Quay, Beel II, Drees III, Drees II, Drees I, Drees-Van Schaik, Beel I |
| ARP | Anti-Revolutionaire Partij | Biesheuvel I en II, Den Uyl, De Jong, Zijlstra, Cals, Marijnen, De Quay, Beel II, Drees III, Drees II |
| CHU | Christelijk-Historische Unie | Biesheuvel I en II, De Jong, Marijnen, De Quay, Beel II, Drees III, Drees II, Drees I, Drees-Van Schaik, Schermerhorn-Drees |
| DS70 | Democratisch-Socialisten 1970 | Biesheuvel I |
| PPR | Politieke Partij Radikalen | Den Uyl |
| LPF | Lijst Pim Fortuyn | Balkenende I |
| SDAP | Sociaal-Democratische Arbeiderspartij | Schermerhorn-Drees |
| RKSP | Rooms-Katholieke Staatspartij | Schermerhorn-Drees |

Niet als sleutel gebruikt maar wel in de bronnen genoemd: NVB (Nederlandse Volksbeweging, een vernieuwingsbeweging, geen partij) en VDB (Vrijzinnig-Democratische Bond), beide bij Schermerhorn-Drees; zie gap R-5.

## Minister-presidenten niet in people.json

De volgende minister-presidenten hebben geen record in data/people.json; hun records hebben `primeMinister: null` (28 records).

| Naam | Partij | Kabinetten |
| --- | --- | --- |
| J.P. Balkenende | CDA | Balkenende I, II, III, IV en het rompkabinet Balkenende IV |
| W. Kok | PvdA | Kok I, II |
| R.F.M. Lubbers | CDA | Lubbers I, II, III |
| A.A.M. van Agt | CDA | Van Agt I, II, III |
| J.M. den Uyl | PvdA | Den Uyl |
| B.W. Biesheuvel | ARP | Biesheuvel I, II |
| P.J.S. de Jong | KVP | De Jong |
| J. Zijlstra | ARP | Zijlstra |
| J.M.L.Th. Cals | KVP | Cals |
| V.G.M. Marijnen | KVP | Marijnen |
| J.E. de Quay | KVP | De Quay |
| L.J.M. Beel | KVP | Beel I, II |
| W. Drees | PvdA | Drees-Van Schaik, Drees I, II, III |
| W. Schermerhorn | NVB, later PvdA | Schermerhorn-Drees |

Wel gevuld: `person:rob-jetten` (Jetten), `person:h-w-m-schoof` (de drie Schoof-records) en `person:mark-rutte` (Rutte IV, Rutte III, Rutte-Asscher, Rutte-Verhagen).

## Gaps

| Id | Wat | Waarom | Endpoint |
| --- | --- | --- | --- |
| R-1 | Documentpagina van het hoofdlijnenakkoord 2024 op rijksoverheid.nl; `agreement` van de drie Schoof-records verwijst nu naar parlement.com (`src:pdc-hoofdlijnenakkoord-2024`, medium) | Drie kandidaat-URL's geven 404; de zoekpagina laadt geen resultaten in de HTML; de kabinetspagina linkt alleen regeerprogramma en regeringsverklaring | https://www.rijksoverheid.nl/zoeken?trefwoord=hoofdlijnenakkoord |
| R-2 | Regeerakkoorden van Balkenende II tot en met Beel I; `agreement` is null in 26 records | De Rijksoverheid-pagina's van deze kabinetten hebben geen documentsectie; parlement.com beschrijft de akkoorden in tekst | https://www.parlement.com/kabinetsformatie |
| R-3 | Status van kabinet-Jetten op 19-09-2026 (missionair of demissionair) | Geen ontslagaanvraag op de officiële pagina's; nieuwsbronnen in data/sources.json noemen een kabinetscrisis in september 2026 | https://www.rijksoverheid.nl/regering/over-de-regering/kabinetten-sinds-1945/kabinet-jetten |
| R-4 | `primeMinister` is null voor 28 records (veertien namen, zie hierboven) | Alleen bestaande person-ids zijn toegestaan; de namen staan niet in data/people.json | https://www.parlement.com/het-biografisch-archief |
| R-5 | Partijbasis van kabinet-Schermerhorn-Drees (record op medium) | Bronnen verschillen: parlement.com noemt SDAP, CHU, RKSP plus partijlozen en NVB; de Rijksoverheid labelt NVB/PvdA, RKSP/KVP, SDAP/PvdA, ARP, Lib. en noemt geen CHU | https://www.parlement.com/kabinet-schermerhorndrees-1945-1946 |
