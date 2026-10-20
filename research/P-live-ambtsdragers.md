# Workstream P: live ambtsdragers

- Gegenereerd: 20-10-2026
- Bron: officiële pagina's van Rijksoverheid en de Eerste Kamer, en het Tweede Kamer OData-gegevensmagazijn (FractieZetelPersoon met gesloten rijen, Fractie, Presidium).
- Werkwijze: fetch, nooit uit het geheugen; elke startdatum komt uit een bron of uit een bestaand, al gedateerd record. Geen einddatum wordt verzonnen: een sluiting zonder bronrij krijgt de ophaaldatum met confidence medium en staat in de reviewlijst.
- Bewaking: een bron met inconsistente data (zetels, dubbele zetels, fractietotalen, 75 leden, 28 plus of min 3 bewindspersonen) schrijft niets; bulksluitingen alleen bij een gebeurtenis (ADR 0024).

## Endpoints

| Bron | URL | Opgehaald | Status |
| --- | --- | --- | --- |

## Tellingen

- Bewindspersonen: 0 opgehaald, 0 gematcht.
- Tweede Kamer: 0 geldige leden, 0 gematcht.
- Eerste Kamer: 0 leden, 0 gematcht.
- Gemeenten (TOOI, register, CBS): 0 gelezen, 0 gekoppeld.
- Provincies (TOOI, register, CBS): 0 gelezen, 0 gekoppeld.
- Waterschappen (TOOI, register): 0 gelezen, 0 gekoppeld.
- Commissarissen van de Koning (Rijksoverheid): 0 gelezen, 0 gekoppeld.
- Nieuwe personen: 0.
- Uitgegeven tenures: 457. Uitgegeven memberships: 225.
- Geopend: 0. Gesloten: 0.
- Gestopt door de bewaking: 0. Gaps: 0.

## Toelichting

- De Rijksoverheid-pagina noemt geen benoemingsdatum. Voor bestaande bewindspersonen is de start uit het bestaande open record overgenomen; een nieuwe bewindspersoon krijgt een onbekende start (ADR 0020).
- Tweede Kamer: open zetelrijen, gesloten rijen die sinds de cursor zijn gewijzigd (ApiGewijzigdOp, dus ook achterdateerde rijen), Fractie.AantalZetels als controle, en het Presidium voor de Voorzitter en de ondervoorzitters.
- Eerste Kamer: ledenlijst, fractiebesturen en de Voorzitter uit de eigen pagina's; de pagina noemt geen einddatum, dus een vervangen fractievoorzitter wordt gesloten op de dag voor de start van de opvolger (confidence medium, reviewlijst).
- Sluitingen krijgen de officiële einddatum van de bronrij (TotEnMet) wanneer die bestaat, anders de ophaaldatum met confidence medium.

## Gaps

Geen.

