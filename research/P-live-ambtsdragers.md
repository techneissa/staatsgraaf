# Workstream P: live ambtsdragers

- Gegenereerd: 18-09-2026
- Bron: officiële pagina's van Rijksoverheid, de Eerste Kamer en het Tweede Kamer OData-gegevensmagazijn.
- Werkwijze: fetch, nooit uit het geheugen; elke startdatum komt uit een bron of uit een bestaand, al gedateerd record.

## Endpoints

| Bron | URL | Opgehaald | Status |
| --- | --- | --- | --- |
| Rijksoverheid bewindspersonen | https://www.rijksoverheid.nl/regering/bewindspersonen | 18-09-2026 | 200 |
| Tweede Kamer OData FractieZetelPersoon | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/FractieZetelPersoon?$filter=TotEnMet eq null&$expand=Persoon,FractieZetel($expand=Fractie)&$format=json&$top=250 | 18-09-2026 | 200 |
| Eerste Kamer alle leden | https://www.eerstekamer.nl/alle_leden | 18-09-2026 | 200 |

## Tellingen

- Bewindspersonen: 28 opgehaald, 28 gematcht.
- Tweede Kamer: 150 geldige leden, 150 gematcht.
- Eerste Kamer: 75 leden, 75 gematcht.
- Nieuwe personen: 0.
- Uitgegeven tenures: 28 (waarvan 28 overgenomen met bestaande start).
- Uitgegeven memberships: 225 (waarvan 225 overgenomen, 0 nieuw).
- Geopend: 0. Gesloten: 0.
- Gaps: 0.

## Toelichting

- De Rijksoverheid-pagina noemt geen benoemingsdatum. Voor bestaande bewindspersonen is de start uit het bestaande open record overgenomen; nieuwe bewindspersonen zonder start gaan naar de gaps.
- De OData-query met alleen TotEnMet eq null levert 157 rijen, waarvan 7 verwijderde tombstones zonder persoon. De parser houdt 150 geldige leden over.
- De Eerste Kamer overzichtspagina noemt ancienniteit in dagen, geen startdatum; die dagentelling wordt niet omgerekend. Bestaande open memberships houden hun start.
- Sluitingen (aftredende ambtsdragers) krijgen de ophaaldatum als einddatum en de opgehaalde pagina als bron.

## Gaps

Geen.

