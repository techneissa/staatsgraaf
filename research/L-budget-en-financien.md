# L. Budget en financien

## Scope covered

Dit werkstream levert de uitgaven, ontvangsten en het netto van het Rijk per ministerie, met historie. Het dekt de twaalf ministeries uit werkstream A en gebruikt het begrotingshoofdstuk als rekeneenheid. Per ministerie staan drie budgetrecords in `budgets[]`:

- 2025, het laatste afgesloten jaar met een gepubliceerde realisatie: `current` met `spendingBudget`, `spendingActual`, `revenue` en `net`, een `previous` voor 2024 en een `history` van 2013 tot en met 2024.
- 2026, het lopende begrotingsjaar: alleen het budget, want er is nog geen realisatie gepubliceerd.
- 2027, de jongste ontwerpbegroting uit de Miljoenennota 2027: alleen het budget.

Dat zijn 36 records, twaalf ministeries maal drie jaren. Elk record houdt de eigen eenheid van de bron: EUR x 1.000 (duizend euro). De realisatiereeksen lopen van 2013 tot en met 2025. Voor Landbouw, Visserij, Voedselzekerheid en Natuur begint de reeks in 2019, omdat landbouw tot en met 2018 onder begrotingshoofdstuk XIII viel (zie Gaps).

| Ministerie (zonder `org:ministerie-van-`) | 2025 realisatie | 2025 ontvangsten | 2025 budget | 2026 budget | 2027 budget | historiejaren |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| algemene-zaken | 118473 | 13827 | 117978 | 117087 | 112663 | 2013-2024 |
| binnenlandse-zaken-en-koninkrijksrelaties | 13449283 | 2709250 | 14450301 | 14567828 | 15163420 | 2013-2024 |
| buitenlandse-zaken | 17005709 | 2635699 | 16948865 | 20860245 | 21659361 | 2013-2024 |
| defensie | 15669893 | 527009 | 15105978 | 23335562 | 14792147 | 2013-2024 |
| economische-zaken-en-klimaat | 9188801 | 4735101 | 10485117 | 16450153 | 18367336 | 2013-2024 |
| financien | 57218643 | 305077456 | 60772320 | 57094502 | 64823646 | 2013-2024 |
| infrastructuur-en-waterstaat | 13905428 | 117112 | 14623828 | 4100475 | 4251379 | 2013-2024 |
| justitie-en-veiligheid | 26482686 | 2325516 | 27358183 | 27695414 | 28099742 | 2013-2024 |
| landbouw-visserij-voedselzekerheid-en-natuur | 3756876 | 272881 | 4246426 | 3351893 | 4308631 | 2019-2024 |
| onderwijs-cultuur-en-wetenschap | 59531879 | 3368378 | 59808440 | 60169270 | 60774324 | 2013-2024 |
| sociale-zaken-en-werkgelegenheid | 60927099 | 2589340 | 61094758 | 66431755 | 68335212 | 2013-2024 |
| volksgezondheid-welzijn-en-sport | 34830356 | 1309173 | 35792565 | 38527780 | 40712140 | 2013-2024 |

Bedragen in EUR x 1.000. De grenzen met de buurworkstreams: werkstream A bezit de organisatie-ids en de ministerielijst, dit werkstream voegt geen organisaties toe en wijzigt geen ids. Personen, posities en relaties blijven bij A, C, H en I.

Niet gedekt: de decentrale overheden en de aparte begrotingsfondsen. Beide staan als benoemde gaps.

## Sources fetched with dates

Alles opgehaald op 18-09-2026. Ruwe snapshots staan onder `research/raw/L/`.

- Ministerie van Financien, rijksfinancien.nl, https://www.rijksfinancien.nl/. Landingspagina met de actuele Miljoenennota 2027 en de begrotingshoofdstukken.
- Ministerie van Financien, Open data overzicht datasets, https://www.rijksfinancien.nl/open-data/overzicht-datasets. Index van de machineleesbare begroting; noemt de CC0-licentie.
- Ministerie van Financien, Begrotingsstaten 2013-2027, https://www.rijksfinancien.nl/sites/default/files/bestanden/open_data/Begrotingsstaten_2013-2027.json. Primair: 7.947 rijen per begrotingshoofdstuk en artikel, per fase (StandOWB, StandO1, StandSBS, StandO2, Realisatie) en per VUO (V, U, O), in EUR x 1.000.
- Ministerie van Financien, Begrotingsstaten 2013-2027 (CSV), https://www.rijksfinancien.nl/sites/default/files/bestanden/open_data/Begrotingsstaten_2013-2027.csv. Zelfde data; header gecontroleerd.
- Ministerie van Financien, Miljoenennota 2027 bijlage 2, Uitgaven en niet-belastingontvangsten, https://www.rijksfinancien.nl/sites/default/files/bestanden/open_data/MJN-2027_Bijlagen_2_Uitgaven_en_Niet_Belastingontvangsten.xlsx. Tabellen 2.2 en 2.3 per begrotingshoofdstuk 2026-2031, in EUR x 1.000.000. Gebruikt als kruiscontrole op 2026 en 2027.
- Ministerie van Financien, API-documentatie, https://www.rijksfinancien.nl/open-data/api-documentatie, en de OpenAPI-specificatie https://www.rijksfinancien.nl/swagger.json.
- Ministerie van Financien, per-chapter instrumenttotalen, https://www.rijksfinancien.nl/open-data/api/json/v2/financiele_instrumenten/hoofdstukken. Bedragen in euro's, 2016-2025, slechts vier hoofdstukken. Alleen gebruikt als eenheidscontrole: OCW 2025 54.986.484.000 euro komt overeen met 54.986.484 x 1.000.
- Ministerie van Financien, article-level budgettable 2025, https://www.rijksfinancien.nl/open-data/api/json/budgettaire_tabellen?year=2025. `verantwoordelijk_minister` is leeg in elke rij, daarom niet gebruikt voor de koppeling.
- Ministerie van Financien, beschikbare jaren, https://www.rijksfinancien.nl/open-data/api/json/v2/financiele_instrumenten/available_years. Jaren 2016-2025.
- Officielebekendmakingen.nl, Staatscourant 2026, 8177, https://www.officielebekendmakingen.nl/stcrt-2026-8177. Besluit van 23 februari 2026 over de herindeling van Asiel en Migratie, Volkshuisvesting en Ruimtelijke Ordening en Klimaat en Groene Groei.

## Decisions

1. **Het begrotingshoofdstuk is de rekeneenheid.** De Begrotingsstaten zijn per hoofdstuk en artikel; er bestaat geen machineleesbare reeks per ministerie. Het alternatief, de API-parameter `verantwoordelijk_minister`, is niet bruikbaar omdat die in 2025 in alle 6.374 rijen leeg is.
2. **Koppeling van hoofdstukken aan de twaalf organisatie-ids van A.**
   - Algemene Zaken: `Algemene Zaken`.
   - Binnenlandse Zaken en Koninkrijksrelaties: `Binnenlandse Zaken en Koninkrijksrelaties`, `Koninkrijksrelaties`, `Volkshuisvesting en Ruimtelijke Ordening`.
   - Buitenlandse Zaken: `Buitenlandse Zaken`, `Buitenlandse Handel en Ontwikkelingssamenwerking`, `Buitenlandse Handel & Ontwikkelingssamenwerking`, `Buitenlandse Handel en Ontwikkelingshulp`.
   - Defensie: `Defensie`.
   - Economische Zaken en Klimaat: `Economische Zaken`, `Economische Zaken en Klimaat`, `Klimaat en Groene Groei`.
   - Financien: `Financien en Nationale Schuld`, `Financien`.
   - Infrastructuur en Waterstaat: `Infrastructuur en Waterstaat`, `Infrastructuur en Milieu`.
   - Justitie en Veiligheid: `Justitie en Veiligheid`, `Veiligheid en Justitie`, `Asiel en Migratie`.
   - Landbouw, Visserij, Voedselzekerheid en Natuur: `Landbouw, Visserij, Voedselzekerheid en Natuur`, `Landbouw Visserij Voedselzekerheid en Natuur`, `Landbouw, Natuur en Voedselkwaliteit`.
   - Onderwijs, Cultuur en Wetenschap: `Onderwijs, Cultuur en Wetenschap`, `Onderwijs Cultuur en Wetenschap`.
   - Sociale Zaken en Werkgelegenheid: `Sociale Zaken en Werkgelegenheid`.
   - Volksgezondheid, Welzijn en Sport: `Volksgezondheid, Welzijn en Sport`, `Volksgezondheid Welzijn en Sport`.
   Het alternatief, een koppeling op hoofdstuknummer, is niet genomen omdat de nummering per kabinet verschuift. Algemene Zaken staat in 2025 deels onder IIB en deels onder III, en Infrastructuur en Milieu werd Infrastructuur en Waterstaat.
3. **Portefeuillecontinuiteit boven entiteitshistorie.** De per 23 februari 2026 opgeheven ministeries Asiel en Migratie, Volkshuisvesting en Ruimtelijke Ordening en Klimaat en Groene Groei zijn volgens Staatscourant 2026, 8177 overgegaan naar respectievelijk J&V, BZK en EZ en Klimaat. Hun begrotingshoofdstukken XX, XXII en XXIII zijn daarom ook voor eerdere jaren aan het moederministerie toegewezen, zodat elke organisatie een doorlopende reeks houdt. Het alternatief, de opgeheven ministeries als eigen organisaties met een `succeeded_by`-relatie, is niet genomen omdat werkstream A de organisatieset bezit en die drie niet opneemt.
4. **Deduplicatie van dubbele artikelrijen.** De brondata bevat 100 dubbele groepen: hetzelfde jaar, hoofdstuk, VUO, artikelnummer en artikelnaam, soms met een ontbrekende fase. Per groep is per kolom het maximum genomen. Zonder die regel dubbeltellen bijvoorbeeld VWS 2025 artikel 8 (62,8 miljard in plaats van 34,8 miljard) en Algemene Zaken 2026 (222,6 miljoen in plaats van circa 117 miljoen). De koppeling op artikelnaam en niet op artikelnummer is bewust: in hoofdstuk IX staan onder hetzelfde nummer inhoudelijk verschillende artikelen.
5. **`spendingBudget` is de laatste stand, niet de oorspronkelijke ontwerpbegroting.** Per artikel is de voorkeursorde O2, dan SBS, dan O1, dan OWB. Daarmee komen alle 2026- en 2027-cijfers, behalve Financien, exact overeen met de Miljoenennota 2027, bijlage 2, tabellen 2.2 en 2.3. De alternatieve keuze, de oorspronkelijke OWB als budget, is niet genomen.
6. **Eenheid blijft die van de bron.** De records staan in EUR x 1.000 (Begrotingsstaten). De Miljoenennota-bijlage is in EUR x 1.000.000 en is alleen als kruiscontrole gebruikt, niet in de records verwerkt. Er is niet omgerekend tussen eenheden.
7. **Financien is bruto.** Begrotingshoofdstuk IX bevat ook financieringstransacties zoals `Financiering staatsschuld` (2026: circa 37,5 miljard) en `Kasbeheer`. Het record toont daardoor de bruto begroting van het hoofdstuk, circa 57,1 miljard voor 2026 tegen circa 27,7 miljard in de netto transactiebasis van de Miljoenennota. Bewust niet gecorrigeerd; zie Gaps en Open questions.
8. **De aparte begrotingsfondsen zijn niet aan een ministerie toegewezen.** Mobiliteitsfonds, Deltafonds, Defensiematerieelbegrotingsfonds, Gemeentefonds, Provinciefonds, BES-fonds, Diergezondheidsfonds, Nationaal Groeifonds en Klimaatfonds zijn eigen begrotingshoofdstukken. Toewijzing zou dubbeltellen met de bijdragen die de ministeries aan de fondsen overmaken.
9. **Landbouw begint in 2019.** Tot en met 2018 was er geen zelfstandig LNV-hoofdstuk; de reeks start daarom bij het eerste jaar met een eigen hoofdstuk XIV, 2019.
10. **Historievenster.** `history` bevat 2013 tot en met 2024, `previous` is 2024.
11. **Parseren van de Miljoenennota-bijlage.** De bijlage is alleen als XLSX beschikbaar. Het bestand is als zip uitgepakt en `xl/worksheets/sheet2.xml` (uitgaven) en `sheet3.xml` (niet-belastingontvangsten) zijn met een korte XML-lezer uitgelezen; de cellen gebruiken inline strings. Er is geen spreadsheetbibliotheek nodig. De ruwe XLSX staat onder `research/raw/L/`.

## Gaps

1. **Decentrale begrotingen (provincies, gemeenten, waterschappen).** Buiten de scope van dit werkstream. Endpoint: https://opendata.cbs.nl/ODataApi/OData/86247NED. Herstart: per overheidslaag de begroting en jaarrekening ophalen uit CBS StatLine en het CBS-begrotingsonderzoek.
2. **Toewijzing van de begrotingsfondsen.** Fondsen hebben geen eigen ministerie. Endpoint: https://www.rijksfinancien.nl/open-data/overzicht-datasets. Herstart: de fondshoofdstukken als eigen organisaties opnemen.
3. **Netto tegenover bruto voor hoofdstuk IX (Financien en Nationale Schuld).** De Begrotingsstaten geven de bruto begroting; de Miljoenennota geeft een netto transactiebasis. Endpoint: https://www.rijksfinancien.nl/sites/default/files/bestanden/open_data/Begrotingsstaten_2013-2027.json. Herstart: de financieringsartikelen afsplitsen van de beleidsuitgaven.
4. **De opgeheven programmaministeries over 2025.** Asiel en Migratie, VRO en Klimaat en Groene Groei bestonden in 2025 en zijn per 23 februari 2026 opgeheven. Endpoint: https://www.officielebekendmakingen.nl/stcrt-2026-8177. Herstart: hoofdstukken XX, XXII en XXIII voor 2025 alsnog als losse organisaties opnemen als het product die entiteiten wil tonen.
5. **Landbouw 2013-2018.** Landbouw viel tot en met 2018 onder hoofdstuk XIII. Endpoint: https://www.rijksfinancien.nl/sites/default/files/bestanden/open_data/Begrotingsstaten_2013-2027.json. Herstart: de landbouwuitgaven binnen hoofdstuk XIII isoleren met de herindelings-KB's.

## Open questions

1. Wil het product voor Financien de bruto begrotingshoofdstukpresentatie of de netto transactiebasis van de Miljoennota? Wie: orchestrator en producteigenaar.
2. Moeten de opgeheven programmaministeries (Asiel en Migratie, VRO, Klimaat en Groene Groei) als eigen organisaties met een `succeeded_by`-relatie worden gemodelleerd, of blijft de portefeuillecontinuiteit gehandhaafd? Wie: werkstream A en de orchestrator.
3. Moet de budgethistorie de portefeuille volgen (zoals hier) of de entiteit zoals die in dat jaar bestond? Wie: orchestrator, raakt het model in `04-data-model.md` sectie 12.
4. Horen interne rijksbijdragen (`Bijdrage andere begrotingen Rijk`) bij de ontvangsten van een ministerie, of alleen de externe ontvangsten? Dit werkstream telt alles wat het hoofdstuk als ontvangst boekt. Wie: orchestrator.
5. Worden de begrotingsfondsen in een latere fase als zelfstandige organisaties met eigen budgetrecords opgenomen? Wie: orchestrator, fase 7.
