# Workstream P: live ambtsdragers

- Gegenereerd: 17-10-2026
- Bron: officiële pagina's van Rijksoverheid en de Eerste Kamer, en het Tweede Kamer OData-gegevensmagazijn (FractieZetelPersoon met gesloten rijen, Fractie, Presidium).
- Werkwijze: fetch, nooit uit het geheugen; elke startdatum komt uit een bron of uit een bestaand, al gedateerd record. Geen einddatum wordt verzonnen: een sluiting zonder bronrij krijgt de ophaaldatum met confidence medium en staat in de reviewlijst.
- Bewaking: een bron met inconsistente data (zetels, dubbele zetels, fractietotalen, 75 leden, 28 plus of min 3 bewindspersonen) schrijft niets; bulksluitingen alleen bij een gebeurtenis (ADR 0024).

## Endpoints

| Bron | URL | Opgehaald | Status |
| --- | --- | --- | --- |
| TOOI gemeenten | https://identifier.overheid.nl/tooi/id/gemeente?format=json | 17-10-2026 | 200 |
| Register gemeenten | https://organisaties.overheid.nl/export/Gemeenten.csv | 17-10-2026 | 200 |
| Register medewerkers gemeenten | https://organisaties.overheid.nl/export-medewerkers/Gemeenten.csv | 17-10-2026 | 200 |
| CBS catalogus | https://opendata.cbs.nl/ODataCatalog/Tables?$format=json&$filter=startswith(Title%2C'Gebieden%20in%20Nederland')&$select=Identifier,Title,Modified,Period | 17-10-2026 | 200 |
| CBS 86247NED | https://opendata.cbs.nl/ODataApi/odata/86247NED/TypedDataSet?$select=Code_1,Naam_2,Code_28,Naam_29 | 17-10-2026 | 200 |
| TOOI provincies | https://identifier.overheid.nl/tooi/id/provincie?format=json | 17-10-2026 | 200 |
| Register provincies | https://organisaties.overheid.nl/export/Provincies.csv | 17-10-2026 | 200 |
| Register medewerkers provincies | https://organisaties.overheid.nl/export-medewerkers/Provincies.csv | 17-10-2026 | 200 |
| CBS catalogus | https://opendata.cbs.nl/ODataCatalog/Tables?$format=json&$filter=startswith(Title%2C'Gebieden%20in%20Nederland')&$select=Identifier,Title,Modified,Period | 17-10-2026 | 200 |
| CBS 86247NED | https://opendata.cbs.nl/ODataApi/odata/86247NED/TypedDataSet?$select=Code_1,Naam_2,Code_28,Naam_29 | 17-10-2026 | 200 |
| TOOI waterschappen | https://identifier.overheid.nl/tooi/id/waterschap?format=json | 17-10-2026 | 200 |
| Register waterschappen | https://organisaties.overheid.nl/export/Waterschappen.csv | 17-10-2026 | 200 |
| Register medewerkers waterschappen | https://organisaties.overheid.nl/export-medewerkers/Waterschappen.csv | 17-10-2026 | 200 |
| Rijksoverheid overzicht commissarissen van de Koning | https://www.rijksoverheid.nl/themas/overheid-en-democratie/provincies/commissaris-van-de-koning/overzicht/commissarissen-van-de-koning | 17-10-2026 | 200 |

## Tellingen

- Bewindspersonen: 0 opgehaald, 0 gematcht.
- Tweede Kamer: 0 geldige leden, 0 gematcht.
- Eerste Kamer: 0 leden, 0 gematcht.
- Gemeenten (TOOI, register, CBS): 342 gelezen, 342 gekoppeld.
- Provincies (TOOI, register, CBS): 12 gelezen, 12 gekoppeld.
- Waterschappen (TOOI, register): 21 gelezen, 21 gekoppeld.
- Commissarissen van de Koning (Rijksoverheid): 12 gelezen, 12 gekoppeld.
- Nieuwe personen: 0.
- Uitgegeven tenures: 457. Uitgegeven memberships: 225.
- Geopend: 0. Gesloten: 0.
- Gestopt door de bewaking: 0. Gaps: 4.

## Toelichting

- De Rijksoverheid-pagina noemt geen benoemingsdatum. Voor bestaande bewindspersonen is de start uit het bestaande open record overgenomen; een nieuwe bewindspersoon krijgt een onbekende start (ADR 0020).
- Tweede Kamer: open zetelrijen, gesloten rijen die sinds de cursor zijn gewijzigd (ApiGewijzigdOp, dus ook achterdateerde rijen), Fractie.AantalZetels als controle, en het Presidium voor de Voorzitter en de ondervoorzitters.
- Eerste Kamer: ledenlijst, fractiebesturen en de Voorzitter uit de eigen pagina's; de pagina noemt geen einddatum, dus een vervangen fractievoorzitter wordt gesloten op de dag voor de start van de opvolger (confidence medium, reviewlijst).
- Sluitingen krijgen de officiële einddatum van de bronrij (TotEnMet) wanneer die bestaat, anders de ophaaldatum met confidence medium.

## Gaps

1. Leden van de gemeenteraden (https://organisaties.overheid.nl/export-medewerkers/Gemeenten.csv): het register noemt 8,6 duizend raadsleden met alleen initialen en achternaam, zonder fractie of persoonsnummer; een pagina per persoon past niet in het bestandsbudget van de export (ADR 0022: 20.000 bestanden, nu ruim 9.600). Vervolg: Neem raadsleden pas op als de web-export personen zonder eigen pagina kent, of per gemeente uit een open bron met fractie (bijvoorbeeld de Kiesraad-uitslagen).
2. Wethouders (https://organisaties.overheid.nl/Gemeenten/): de bron is compleet genoeg (341 van 342 gemeenten), maar de opname staat uit: ongeveer 1,4 duizend extra personen betekenen ongeveer 2,8 duizend extra bestanden en een veel zwaardere personenlijst op de web-export. Vervolg: Zet DEFAULT_OPTIONS.wethouders in pipelines/decentral-plan.mjs aan, of draai met STAATSGRAAF_LIVE_WETHOUDERS=1, zodra de web-eigenaar de bestandsgroei accepteert.
3. Gedeputeerden en leden van Provinciale Staten (https://organisaties.overheid.nl/export-medewerkers/Provincies.csv): het register vult de Gedeputeerde Staten voor 7 van de 12 provincies en bevat verouderde rijen (Zuid-Holland noemt twee voorzitters); de Statenleden staan alleen voor twee provincies in het register. Vervolg: Zoek een volledige open bron per provincie (de provinciesites zijn niet machineleesbaar en niet als open data gelicentieerd) of wacht op een volledig register.
4. Algemeen bestuur en dagelijks bestuur van de waterschappen (https://organisaties.overheid.nl/export-medewerkers/Waterschappen.csv): het register noemt alleen de dijkgraaf en de secretaris-directeur; de leden van het algemeen en dagelijks bestuur staan in geen open register. Vervolg: Wacht op de Kiesraad-uitslag van de waterschapsverkiezingen of op een open bron van de waterschappen zelf.

