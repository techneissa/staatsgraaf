# Workstream P: live ambtsdragers

- Gegenereerd: 16-10-2026
- Bron: officiële pagina's van Rijksoverheid en de Eerste Kamer, en het Tweede Kamer OData-gegevensmagazijn (FractieZetelPersoon met gesloten rijen, Fractie, Presidium).
- Werkwijze: fetch, nooit uit het geheugen; elke startdatum komt uit een bron of uit een bestaand, al gedateerd record. Geen einddatum wordt verzonnen: een sluiting zonder bronrij krijgt de ophaaldatum met confidence medium en staat in de reviewlijst.
- Bewaking: een bron met inconsistente data (zetels, dubbele zetels, fractietotalen, 75 leden, 28 plus of min 3 bewindspersonen) schrijft niets; bulksluitingen alleen bij een gebeurtenis (ADR 0024).

## Endpoints

| Bron | URL | Opgehaald | Status |
| --- | --- | --- | --- |
| Rijksoverheid bewindspersonen | https://www.rijksoverheid.nl/regering/bewindspersonen | 16-10-2026 | 200 |
| FractieZetelPersoon (huidige leden, met Persoon en Fractie) | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/FractieZetelPersoon?$filter=TotEnMet eq null&$expand=Persoon,FractieZetel($expand=Fractie)&$format=json&$top=250 | 16-10-2026 | 200 |
| FractieZetelPersoon (gesloten rijen, laatst gewijzigd eerst) | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/FractieZetelPersoon?$filter=TotEnMet ne null&$orderby=ApiGewijzigdOp desc | 16-10-2026 | 200 |
| Fractie (actieve fracties met AantalZetels) | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Fractie?$filter=DatumInactief eq null | 16-10-2026 | 200 |
| Presidium (Voorzitter en ondervoorzitters van de Tweede Kamer) | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/CommissieZetelVastPersoon?$filter=CommissieZetel/Commissie/Afkorting eq 'PRES' | 16-10-2026 | 200 |
| Eerste Kamer alle leden | https://www.eerstekamer.nl/alle_leden | 16-10-2026 | 200 |
| Eerste Kamer fracties en fractiebesturen | https://www.eerstekamer.nl/fracties | 16-10-2026 | 200 |
| TOOI gemeenten | https://identifier.overheid.nl/tooi/id/gemeente?format=json | 16-10-2026 | 200 |
| Register gemeenten | https://organisaties.overheid.nl/export/Gemeenten.csv | 16-10-2026 | 200 |
| Register medewerkers gemeenten | https://organisaties.overheid.nl/export-medewerkers/Gemeenten.csv | 16-10-2026 | 200 |
| CBS catalogus | https://opendata.cbs.nl/ODataCatalog/Tables?$format=json&$filter=startswith(Title%2C'Gebieden%20in%20Nederland')&$select=Identifier,Title,Modified,Period | 16-10-2026 | 200 |
| CBS 86247NED | https://opendata.cbs.nl/ODataApi/odata/86247NED/TypedDataSet?$select=Code_1,Naam_2,Code_28,Naam_29 | 16-10-2026 | 200 |
| TOOI provincies | https://identifier.overheid.nl/tooi/id/provincie?format=json | 16-10-2026 | 200 |
| Register provincies | https://organisaties.overheid.nl/export/Provincies.csv | 16-10-2026 | 200 |
| Register medewerkers provincies | https://organisaties.overheid.nl/export-medewerkers/Provincies.csv | 16-10-2026 | 200 |
| CBS catalogus | https://opendata.cbs.nl/ODataCatalog/Tables?$format=json&$filter=startswith(Title%2C'Gebieden%20in%20Nederland')&$select=Identifier,Title,Modified,Period | 16-10-2026 | 200 |
| CBS 86247NED | https://opendata.cbs.nl/ODataApi/odata/86247NED/TypedDataSet?$select=Code_1,Naam_2,Code_28,Naam_29 | 16-10-2026 | 200 |
| TOOI waterschappen | https://identifier.overheid.nl/tooi/id/waterschap?format=json | 16-10-2026 | 200 |
| Register waterschappen | https://organisaties.overheid.nl/export/Waterschappen.csv | 16-10-2026 | 200 |
| Register medewerkers waterschappen | https://organisaties.overheid.nl/export-medewerkers/Waterschappen.csv | 16-10-2026 | 200 |
| Rijksoverheid overzicht commissarissen van de Koning | https://www.rijksoverheid.nl/themas/overheid-en-democratie/provincies/commissaris-van-de-koning/overzicht/commissarissen-van-de-koning | 16-10-2026 | 200 |

## Tellingen

- Bewindspersonen: 28 opgehaald, 28 gematcht.
- Tweede Kamer: 150 geldige leden, 150 gematcht.
- Eerste Kamer: 75 leden, 75 gematcht.
- Gemeenten (TOOI, register, CBS): 342 gelezen, 342 gekoppeld.
- Provincies (TOOI, register, CBS): 12 gelezen, 12 gekoppeld.
- Waterschappen (TOOI, register): 21 gelezen, 21 gekoppeld.
- Commissarissen van de Koning (Rijksoverheid): 12 gelezen, 12 gekoppeld.
- Nieuwe personen: 0.
- Uitgegeven tenures: 457. Uitgegeven memberships: 225.
- Geopend: 0. Gesloten: 0.
- Gestopt door de bewaking: 0. Gaps: 6.

## Toelichting

- De Rijksoverheid-pagina noemt geen benoemingsdatum. Voor bestaande bewindspersonen is de start uit het bestaande open record overgenomen; een nieuwe bewindspersoon krijgt een onbekende start (ADR 0020).
- Tweede Kamer: open zetelrijen, gesloten rijen die sinds de cursor zijn gewijzigd (ApiGewijzigdOp, dus ook achterdateerde rijen), Fractie.AantalZetels als controle, en het Presidium voor de Voorzitter en de ondervoorzitters.
- Eerste Kamer: ledenlijst, fractiebesturen en de Voorzitter uit de eigen pagina's; de pagina noemt geen einddatum, dus een vervangen fractievoorzitter wordt gesloten op de dag voor de start van de opvolger (confidence medium, reviewlijst).
- Sluitingen krijgen de officiële einddatum van de bronrij (TotEnMet) wanneer die bestaat, anders de ophaaldatum met confidence medium.

## Gaps

1. Fractievoorzitter van Fractie-Van Gasteren (https://www.eerstekamer.nl/fractie/fractie_van_gasteren): de fractiepagina noemt geen fractievoorzitter. Vervolg: De bestaande tenure blijft staan.
2. G10: de annotatietekst die het colofon van de Eerste Kamer voorschrijft (https://www.eerstekamer.nl/begrip/colofon): het colofon zegt "Als annotatie wordt daarbij het volgende vermeld:" maar de pagina bevat daarna geen tekst. Vervolg: Neem contact op met de Eerste Kamer of lees de pagina gerenderd; tot die tijd vermeldt elke bron de URL en de extractiedatum.
3. Leden van de gemeenteraden (https://organisaties.overheid.nl/export-medewerkers/Gemeenten.csv): het register noemt 8,6 duizend raadsleden met alleen initialen en achternaam, zonder fractie of persoonsnummer; een pagina per persoon past niet in het bestandsbudget van de export (ADR 0022: 20.000 bestanden, nu ruim 9.600). Vervolg: Neem raadsleden pas op als de web-export personen zonder eigen pagina kent, of per gemeente uit een open bron met fractie (bijvoorbeeld de Kiesraad-uitslagen).
4. Wethouders (https://organisaties.overheid.nl/Gemeenten/): de bron is compleet genoeg (341 van 342 gemeenten), maar de opname staat uit: ongeveer 1,4 duizend extra personen betekenen ongeveer 2,8 duizend extra bestanden en een veel zwaardere personenlijst op de web-export. Vervolg: Zet DEFAULT_OPTIONS.wethouders in pipelines/decentral-plan.mjs aan, of draai met STAATSGRAAF_LIVE_WETHOUDERS=1, zodra de web-eigenaar de bestandsgroei accepteert.
5. Gedeputeerden en leden van Provinciale Staten (https://organisaties.overheid.nl/export-medewerkers/Provincies.csv): het register vult de Gedeputeerde Staten voor 7 van de 12 provincies en bevat verouderde rijen (Zuid-Holland noemt twee voorzitters); de Statenleden staan alleen voor twee provincies in het register. Vervolg: Zoek een volledige open bron per provincie (de provinciesites zijn niet machineleesbaar en niet als open data gelicentieerd) of wacht op een volledig register.
6. Algemeen bestuur en dagelijks bestuur van de waterschappen (https://organisaties.overheid.nl/export-medewerkers/Waterschappen.csv): het register noemt alleen de dijkgraaf en de secretaris-directeur; de leden van het algemeen en dagelijks bestuur staan in geen open register. Vervolg: Wacht op de Kiesraad-uitslag van de waterschapsverkiezingen of op een open bron van de waterschappen zelf.

