# Workstream P: live ambtsdragers

- Gegenereerd: 07-10-2026
- Bron: officiële pagina's van Rijksoverheid en de Eerste Kamer, en het Tweede Kamer OData-gegevensmagazijn (FractieZetelPersoon met gesloten rijen, Fractie, Presidium).
- Werkwijze: fetch, nooit uit het geheugen; elke startdatum komt uit een bron of uit een bestaand, al gedateerd record. Geen einddatum wordt verzonnen: een sluiting zonder bronrij krijgt de ophaaldatum met confidence medium en staat in de reviewlijst.
- Bewaking: een bron met inconsistente data (zetels, dubbele zetels, fractietotalen, 75 leden, 28 plus of min 3 bewindspersonen) schrijft niets; bulksluitingen alleen bij een gebeurtenis (ADR 0024).

## Endpoints

| Bron | URL | Opgehaald | Status |
| --- | --- | --- | --- |
| Rijksoverheid bewindspersonen | https://www.rijksoverheid.nl/regering/bewindspersonen | 07-10-2026 | 200 |
| FractieZetelPersoon (huidige leden, met Persoon en Fractie) | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/FractieZetelPersoon?$filter=TotEnMet eq null&$expand=Persoon,FractieZetel($expand=Fractie)&$format=json&$top=250 | 07-10-2026 | 200 |
| FractieZetelPersoon (gesloten rijen, laatst gewijzigd eerst) | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/FractieZetelPersoon?$filter=TotEnMet ne null&$orderby=ApiGewijzigdOp desc | 07-10-2026 | 200 |
| Fractie (actieve fracties met AantalZetels) | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Fractie?$filter=DatumInactief eq null | 07-10-2026 | 200 |
| Presidium (Voorzitter en ondervoorzitters van de Tweede Kamer) | https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/CommissieZetelVastPersoon?$filter=CommissieZetel/Commissie/Afkorting eq 'PRES' | 07-10-2026 | 200 |
| Eerste Kamer alle leden | https://www.eerstekamer.nl/alle_leden | 07-10-2026 | 200 |
| Eerste Kamer fracties en fractiebesturen | https://www.eerstekamer.nl/fracties | 07-10-2026 | 200 |

## Tellingen

- Bewindspersonen: 28 opgehaald, 28 gematcht.
- Tweede Kamer: 150 geldige leden, 150 gematcht.
- Eerste Kamer: 75 leden, 75 gematcht.
- Gemeenten (TOOI, register, CBS): 0 gelezen, 0 gekoppeld.
- Provincies (TOOI, register, CBS): 0 gelezen, 0 gekoppeld.
- Waterschappen (TOOI, register): 0 gelezen, 0 gekoppeld.
- Commissarissen van de Koning (Rijksoverheid): 0 gelezen, 0 gekoppeld.
- Nieuwe personen: 0.
- Uitgegeven tenures: 457. Uitgegeven memberships: 225.
- Geopend: 0. Gesloten: 0.
- Gestopt door de bewaking: 0. Gaps: 2.

## Toelichting

- De Rijksoverheid-pagina noemt geen benoemingsdatum. Voor bestaande bewindspersonen is de start uit het bestaande open record overgenomen; een nieuwe bewindspersoon krijgt een onbekende start (ADR 0020).
- Tweede Kamer: open zetelrijen, gesloten rijen die sinds de cursor zijn gewijzigd (ApiGewijzigdOp, dus ook achterdateerde rijen), Fractie.AantalZetels als controle, en het Presidium voor de Voorzitter en de ondervoorzitters.
- Eerste Kamer: ledenlijst, fractiebesturen en de Voorzitter uit de eigen pagina's; de pagina noemt geen einddatum, dus een vervangen fractievoorzitter wordt gesloten op de dag voor de start van de opvolger (confidence medium, reviewlijst).
- Sluitingen krijgen de officiële einddatum van de bronrij (TotEnMet) wanneer die bestaat, anders de ophaaldatum met confidence medium.

## Gaps

1. Fractievoorzitter van Fractie-Van Gasteren (https://www.eerstekamer.nl/fractie/fractie_van_gasteren): de fractiepagina noemt geen fractievoorzitter. Vervolg: De bestaande tenure blijft staan.
2. G10: de annotatietekst die het colofon van de Eerste Kamer voorschrijft (https://www.eerstekamer.nl/begrip/colofon): het colofon zegt "Als annotatie wordt daarbij het volgende vermeld:" maar de pagina bevat daarna geen tekst. Vervolg: Neem contact op met de Eerste Kamer of lees de pagina gerenderd; tot die tijd vermeldt elke bron de URL en de extractiedatum.

