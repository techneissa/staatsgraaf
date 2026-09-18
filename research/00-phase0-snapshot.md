# Phase 0 snapshot: current state of the Dutch state

Recorded 17-09-2026 by the orchestrator as the frozen reference for Phase 2 count checks. Every fact below was fetched live on 17-09-2026; raw responses live under `research/raw/00/`. Where a fact is derived rather than printed by the source, the derivation is named.

## 1. Kabinet

Current kabinet: kabinet-Jetten. All 28 bewindspersonen (18 ministers, 10 staatssecretarissen) were appointed 23 februari 2026.

Sources: https://www.rijksoverheid.nl/regering/bewindspersonen (overview, raw `bewindspersonen.out`) and the 28 individual pages under `research/raw/00/bewindspersonen/<slug>.html`. Appointment date read from each page's Loopbaan section ("23 februari 2026 Benoeming ... in het kabinet-Jetten"); the portfolio title and ministerie read from each page's meta description and first ministerie link. Pages carry DCTERMS.rights = "CC0 1.0 Universal".

| Bewindspersoon | Functie | Ministerie | Start |
| --- | --- | --- | --- |
| Rob Jetten | Minister-president | Algemene Zaken | 23-02-2026 |
| Dilan Yeşilgöz-Zegerius | Minister van Defensie (tevens viceminister-president) | Defensie | 23-02-2026 |
| Bart van den Brink | Minister van Asiel en Migratie (2e viceminister-president) | Justitie en Veiligheid | 23-02-2026 |
| Tom Berendsen | Minister van Buitenlandse Zaken | Buitenlandse Zaken | 23-02-2026 |
| Sjoerd Sjoerdsma | Minister van Buitenlandse Handel en Ontwikkelingssamenwerking | Buitenlandse Zaken | 23-02-2026 |
| David van Weel | Minister van Justitie en Veiligheid | Justitie en Veiligheid | 23-02-2026 |
| Pieter Heerma | Minister van Binnenlandse Zaken en Koninkrijksrelaties | Binnenlandse Zaken en Koninkrijksrelaties | 23-02-2026 |
| Elanor Boekholt-O'Sullivan | Minister van Volkshuisvesting en Ruimtelijke Ordening | Binnenlandse Zaken en Koninkrijksrelaties | 23-02-2026 |
| Rianne Letschert | Minister van Onderwijs, Cultuur en Wetenschap | Onderwijs, Cultuur en Wetenschap | 23-02-2026 |
| Eelco Heinen | Minister van Financiën | Financiën | 23-02-2026 |
| Vincent Karremans | Minister van Infrastructuur en Waterstaat | Infrastructuur en Waterstaat | 23-02-2026 |
| Heleen Herbert | Minister van Economische Zaken en Klimaat | Economische Zaken en Klimaat | 23-02-2026 |
| Stientje van Veldhoven-van der Meer | Minister van Klimaat en Groene Groei | Economische Zaken en Klimaat | 23-02-2026 |
| Jaimi van Essen | Minister van Landbouw, Visserij, Voedselzekerheid en Natuur | Landbouw, Visserij, Voedselzekerheid en Natuur | 23-02-2026 |
| Hans Vijlbrief | Minister van Sociale Zaken en Werkgelegenheid | Sociale Zaken en Werkgelegenheid | 23-02-2026 |
| Thierry Aartsen | Minister van Werk en Participatie | Sociale Zaken en Werkgelegenheid | 23-02-2026 |
| Sophie Hermans | Minister van Volksgezondheid, Welzijn en Sport | Volksgezondheid, Welzijn en Sport | 23-02-2026 |
| Mirjam Sterk | Minister van Langdurige Zorg, Jeugd en Sport | Volksgezondheid, Welzijn en Sport | 23-02-2026 |
| Claudia van Bruggen | Staatssecretaris van Justitie en Veiligheid | Justitie en Veiligheid | 23-02-2026 |
| Eric van der Burg | Staatssecretaris Koninkrijksrelaties en Slagvaardige Overheid | Binnenlandse Zaken en Koninkrijksrelaties | 23-02-2026 |
| Judith Tielen | Staatssecretaris Onderwijs en Emancipatie | Onderwijs, Cultuur en Wetenschap | 23-02-2026 |
| Eelco Eerenberg | Staatssecretaris van Financiën | Financiën | 23-02-2026 |
| Sandra Palmen-Schlangen | Staatssecretaris Herstel Toeslagen | Financiën | 23-02-2026 |
| Derk Boswijk | Staatssecretaris van Defensie | Defensie | 23-02-2026 |
| Annet Bertram | Staatssecretaris van Infrastructuur en Waterstaat | Infrastructuur en Waterstaat | 23-02-2026 |
| Willemijn Aerdts | Staatssecretaris Digitale Economie en Soevereiniteit | Economische Zaken en Klimaat | 23-02-2026 |
| Jo-Annes de Bat | Staatssecretaris van Klimaat en Groene Groei | Economische Zaken en Klimaat | 23-02-2026 |
| Silvio Erkens | Staatssecretaris van Landbouw, Visserij, Voedselzekerheid en Natuur | Landbouw, Visserij, Voedselzekerheid en Natuur | 23-02-2026 |

Named gaps: viceminister-president roles are recorded here but not modeled as positions in the seed; workstreams A and I model the full portfolios. Tom Berendsen's page lists both Buitenlandse Zaken and Buitenlandse Handel; the seed places his position at Buitenlandse Zaken per the page's first ministerie link.

## 2. Ministeries

12 ministeries. Source: https://www.rijksoverheid.nl/ministeries (raw `rijksoverheid-ministeries.out`).

1. Ministerie van Algemene Zaken
2. Ministerie van Binnenlandse Zaken en Koninkrijksrelaties
3. Ministerie van Buitenlandse Zaken
4. Ministerie van Defensie
5. Ministerie van Economische Zaken en Klimaat
6. Ministerie van Financiën
7. Ministerie van Infrastructuur en Waterstaat
8. Ministerie van Justitie en Veiligheid
9. Ministerie van Landbouw, Visserij, Voedselzekerheid en Natuur
10. Ministerie van Onderwijs, Cultuur en Wetenschap
11. Ministerie van Sociale Zaken en Werkgelegenheid
12. Ministerie van Volksgezondheid, Welzijn en Sport

The page carries 12 ministerie links; there is no separate ministerie link for Klimaat en Groene Groei, Volkshuisvesting en Ruimtelijke Ordening, or Asiel en Migratie (those portfolios sit under existing ministeries). Legal basis: Grondwet art. 44, https://wetten.overheid.nl/BWBR0001840.

## 3. Tweede Kamer

150 zetels, 17 fracties. Source: Tweede Kamer OData API, https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0 (raw `tk-fracties-actief.json`, `tk-fracties-full.json`, `tk-fractiezetels.json`, `tk-fractiezetelpersonen.json`, `tk-personen-th.json`, `tk-personen-missing.json`).

Fracties: D66 26, VVD 22, PRO 20, PVV 19, CDA 18, JA21 9, Groep Markuszower 7, FVD 7, ChristenUnie 3, SP 3, PvdD 3, SGP 3, BBB 3, DENK 3, 50PLUS 2, Lid Keijzer 1, Volt 1. Sum 150.

Membership records built from FractieZetelPersoon joined to FractieZetel and Fractie; start date is the FractieZetelPersoon.Van value. seatNumber is left null: the API's Gewicht field semantics are not verified, and a guessed seat number would be an invented fact.

## 4. Eerste Kamer

75 leden, 20 fracties. Sources: https://www.eerstekamer.nl/fracties (raw `ek-fracties.out`) and https://www.eerstekamer.nl/alle_leden (raw `ek-alle-leden.out`).

Fracties: PRO 14, BBB 11, VVD 9, D66 7, CDA 6, PVV 4, SP 3, FVD 3, ChristenUnie 3, JA21 2, Volt 2, PvdD 2, SGP 2, 50PLUS 1, OPNL 1, Fractie-Visseren-Hamakers 1, Fractie-Beukering 1, Fractie-Walenkamp 1, Fractie-Van de Sanden 1, Fractie-Van Gasteren 1. Sum 75.

Derived fact: start dates are computed as 17-09-2026 minus the "Anciënniteit: N dagen" value shown on each member's card. This is a derivation, marked medium confidence in the seed; workstream D confirms exact dates from a primary source.

## 5. Gemeenten

342 gemeenten. Source: CBS OpenData table Gebieden in Nederland 2026, id 86247NED, RegioS entity, keys GM#### (raw `cbs-regios.json`). Example: GM1680 Aa en Hunze.

## 6. Provincies

12 provincies. Source: CBS OpenData table 70072ned, RegioS keys PV## (raw `cbs-provincies.json`): PV20 Groningen, PV21 Fryslân, PV22 Drenthe, PV23 Overijssel, PV24 Flevoland, PV25 Gelderland, PV26 Utrecht, PV27 Noord-Holland, PV28 Zuid-Holland, PV29 Zeeland, PV30 Noord-Brabant, PV31 Limburg.

## 7. Waterschappen

21 waterschappen. Source: CBS OpenData table 80445ned, entity Waterschappen (raw `cbs-waterschappen.json`; the table notes the indeling was last revised on 1 januari 2017 and counts 21 waterschappen since that date). Current 21: WS02 Rijn en IJssel, WS07 Hoogheemraadschap van Delfland, WS10 De Dommel, WS12 Hoogheemraadschap van Rijnland, WS13 Rivierenland, WS14 Hoogheemraadschap De Stichtse Rijnlanden, WS16 Hunze en Aa's, WS17 Noorderzijlvest, WS20 Zuiderzeeland, WS21 Hoogheemraadschap Hollands Noorderkwartier, WS22 Brabantse Delta, WS23 Wetterskip Fryslân, WS24 Aa en Maas, WS25 Hollandse Delta, WS26 Hoogheemraadschap van Schieland en Krimpenerwaard, WS27 Scheldestromen, WS28 Vallei en Veluwe, WS29 Vechtstromen, WS30 Waterschap Drents Overijsselse Delta, WS31 Waterschap Limburg, WS32 Waterschap Amstel, Gooi en Vecht.

Excluded from the current count: WS89 Waterschapsbedrijf Limburg (a samenwerkingsverband, not a waterschap), WS05 (renamed to WS32), all rows marked Opgeheven, and NL01 Nederland (country total). Named gap: waterschappen.nl returned 403 to fetch; the CBS table is the count source.

## 8. Veiligheidsregio's

25 veiligheidsregio's. Source: https://www.rijksoverheid.nl/themas/recht-veiligheid-en-defensie/veiligheidsregios-en-crisisbeheersing/veiligheidsregios (raw `rijksoverheid-veiligheidsregios.out`): Groningen, Friesland, Drenthe, IJsselland, Twente, Noord- en Oost-Gelderland, Gelderland-Midden, Gelderland-Zuid, Utrecht, Noord-Holland Noord, Zaanstreek-Waterland, Kennemerland, Amsterdam-Amstelland, Gooi en Vechtstreek, Haaglanden, Hollands Midden, Rotterdam-Rijnmond, Zuid-Holland Zuid, Zeeland, Midden- en West-Brabant, Brabant-Noord, Brabant-Zuidoost, Limburg-Noord, Zuid-Limburg, Flevoland. Legal basis: Wet veiligheidsregio's, https://wetten.overheid.nl/BWBR0027466 (art. 8 en bijlage).

## Counts for the Phase 2 cross-check

| Item | Count |
| --- | --- |
| Bewindspersonen in kabinet-Jetten | 28 |
| Ministeries | 12 |
| Tweede Kamerzetels | 150 |
| Eerste Kamerzetels | 75 |
| Gemeenten | 342 |
| Provincies | 12 |
| Waterschappen | 21 |
| Veiligheidsregio's | 25 |
