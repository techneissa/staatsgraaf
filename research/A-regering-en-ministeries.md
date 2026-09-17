# Workstream A: regering en ministeries

## Scope covered

This workstream covers the regering, de Ministerraad, het kabinet-Jetten, de minister-president, de 12 ministeries met beschrijving, wettelijke grondslag, website en oprichtingsdatum waar gedocumenteerd, de interne ambtelijke structuur tot SG- en DG-niveau waar de site de huidige houder noemt, en het Koninklijk Huis voor zover publiek gedocumenteerd: de Koning, de Dienst van het Koninklijk Huis, het Kabinet van de Koning en de Kanselarij der Nederlandse Orden. De grens met de buurworkstreams ligt bij de uitvoeringsorganisaties: agentschappen, inspecties en ZBO's zijn workstream B en C, de adviescolleges F, het parlement D en de decentrale overheid G. Die zijn hier niet opnieuw opgevoerd.

Entity counts in `research/A-regering-en-ministeries.json`:

| Array | Count |
| --- | --- |
| organizations | 17 |
| positions | 49 |
| people | 48 |
| tenures | 34 |
| relations | 49 |
| sources | 98 |
| gaps | 7 |

The 17 organizations are the 12 ministeries, `org:regering`, `org:ministerraad`, `org:dienst-van-het-koninklijk-huis`, `org:kabinet-van-de-koning` and `org:kanselarij-der-nederlandse-orden`. The 49 positions are the 28 bewindspersonen, the vice-minister-president (2 seats), de Koning, de directeur van het Kabinet van de Koning, 10 secretarissen-generaal en 8 directeuren-generaal. The 34 tenures are the 28 kabinetsbenoemingen van 23 februari 2026, de twee vice-minister-presidenten, de Koning (30 april 2013), de waarnemend directeur van het Kabinet van de Koning (24 februari 2026) en twee SG's met een gepubliceerde datum (BZ en Defensie).

### Coverage sample: 10 entities checked link by link

Every URL below was requested on 2026-09-18 and returned HTTP 200. The KB-URLs on `officielebekendmakingen.nl` resolve via a 302 to `zoek.officielebekendmakingen.nl`; both are named.

1. `org:ministerie-van-algemene-zaken`. Beschrijving en website: https://www.rijksoverheid.nl/ministeries/ministerie-van-algemene-zaken. Oprichting 3 juli 1937: https://www.rijksoverheid.nl/ministeries/ministerie-van-algemene-zaken/organisatie/geschiedenis. Wettelijke grondslag: https://wetten.overheid.nl/BWBR0001840 (art. 44).
2. `org:ministerie-van-financien`. Bestaan sinds 1798: https://www.rijksoverheid.nl/ministeries/ministerie-van-financien/organisatie/geschiedenis. Beleidsterrein en website: https://www.rijksoverheid.nl/ministeries/ministerie-van-financien. SG en DG's: https://www.rijksoverheid.nl/ministeries/ministerie-van-financien/organisatie/organogram/ambtelijke-leiding.
3. `org:regering`. Kabinet-Jetten beedigd op 23 februari 2026, 18 ministers en 10 staatssecretarissen: https://www.rijksoverheid.nl/regering. Benoeming van de minister-president: https://www.officielebekendmakingen.nl/stcrt-2026-8174 (naar https://zoek.officielebekendmakingen.nl/stcrt-2026-8174). Regering is Koning plus ministers: https://wetten.overheid.nl/BWBR0001840 (art. 42).
4. `org:ministerraad`. Ministers vormen te zamen de ministerraad, de minister-president is voorzitter: https://wetten.overheid.nl/BWBR0001840 (art. 45) en https://www.rijksoverheid.nl/regering/ministerraad.
5. `person:rob-jetten`, `pos:minister-president`, `tenure:minister-president-rob-jetten`. Combinatieportfolio minister-president en minister van Algemene Zaken: https://www.rijksoverheid.nl/regering/bewindspersonen/rob-jetten. Benoeming en ingangsdatum 23 februari 2026: https://www.officielebekendmakingen.nl/stcrt-2026-8174.
6. `pos:vice-minister-president` met `person:dilan-yesilgoz-zegerius` en `person:bart-van-den-brink`. Benoeming van twee vice-minister-presidenten: https://www.officielebekendmakingen.nl/stcrt-2026-8178. Portfolios: https://www.rijksoverheid.nl/regering/bewindspersonen/dilan-yesilgoz-zegerius en https://www.rijksoverheid.nl/regering/bewindspersonen/bart-van-den-brink. Vervangingsregeling: https://www.officielebekendmakingen.nl/stcrt-2026-8194.
7. `person:willem-alexander` en `pos:koning`. Troonsaanvaarding 30 april 2013 en rol: https://www.koninklijkhuis.nl/leden-koninklijk-huis/koning-willem-alexander. Constitutionele rol en ministeriele verantwoordelijkheid: https://www.koninklijkhuis.nl/onderwerpen/koninklijk-huis/rol-van-het-staatshoofd.
8. `org:kanselarij-der-nederlandse-orden`. Taken, geschiedenis vanaf 1815 en 22 arbeidsplaatsen: https://www.koninklijkhuis.nl/onderwerpen/koninklijk-huis/onderscheidingen/kanselarij-der-nederlandse-orden. Plaats in het onderscheidingenstelsel: https://www.koninklijkhuis.nl/onderwerpen/koninklijk-huis/onderscheidingen.
9. `person:christiaan-rebergen` en `pos:secretaris-generaal-ministerie-van-buitenlandse-zaken`. Huidige SG sinds 12 augustus 2024: https://www.rijksoverheid.nl/ministeries/ministerie-van-buitenlandse-zaken/organisatie/organogram/secretaris-generaal-en-plaatsvervangend-sg.
10. `person:maarten-schurink` en `pos:secretaris-generaal-ministerie-van-defensie`. Huidige SG sinds 21 augustus 2023: https://www.rijksoverheid.nl/ministeries/ministerie-van-defensie/organisatie/organogram/ambtelijke-leiding.

Extra, outside the ten: `person:f-j-j-princen`, waarnemend directeur van het Kabinet van de Koning met ingang van 24 februari 2026: https://www.officielebekendmakingen.nl/stcrt-2026-8740. Dienst van het Koninklijk Huis: https://www.koninklijkhuis.nl/onderwerpen/organisatie/dienst-koninklijk-huis.

## Sources fetched with dates

All pages were fetched with a browser User-Agent, at most about one request per second per host. The kilobytes below are the cached copies under `research/raw/A/`.

Retrieved 2026-09-17 (reused cache from the earlier run):

- Overheid.nl, Grondwet BWBR0001840, artikel 42 tot en met 47, https://wetten.overheid.nl/BWBR0001840, `wetten/grondwet-art42-47.txt` and `wetten/grondwet-bwbr0001840.html`. Yields the regering, de ministerraad, de benoeming van ministers en staatssecretarissen en de ministeriele verantwoordelijkheid.
- Rijksoverheid, Ministeries, https://www.rijksoverheid.nl/ministeries, `rijksoverheid-ministeries.html`. Yields de 12-ministerieslijst.
- Rijksoverheid, Regering, https://www.rijksoverheid.nl/regering, `rijksoverheid-regering.html`. Yields kabinet-Jetten, beediging 23 februari 2026, 18 ministers en 10 staatssecretarissen, regeerakkoord.
- Rijksoverheid, Bewindspersonen, https://www.rijksoverheid.nl/regering/bewindspersonen, `rijksoverheid-bewindspersonen.html` plus 28 persoonspagina's onder `bewindspersonen/`. Yields functietitel, portfolio, ministerie en benoemingsdatum per bewindspersoon; elke pagina draagt CC0 1.0 Universal.
- Rijksoverheid, 12 ministeriepagina's en de organogrammen, onder `ministeries/`. Yields de zelfgeschreven beschrijvingen en de interne structuur.
- Rijksoverheid, geschiedenispagina's van AZ, Buitenlandse Zaken, Financien, OCW en VWS, onder `ministeries/`. Yields de gedocumenteerde oprichtings- en naamgevingsfeiten.
- Rijksoverheid, ambtelijke leiding van BZK, https://www.rijksoverheid.nl/ministeries/ministerie-van-binnenlandse-zaken-en-koninkrijksrelaties/organisatie/organogram/ambtelijke-leiding, `ministeries/bzk-ambtelijke-leiding.html`. Yields SG Vincent Roozen en pSG Mark de Boer.
- Rijksoverheid, secretaris-generaal van EZK, https://www.rijksoverheid.nl/ministeries/ministerie-van-economische-zaken-en-klimaat/organisatie/organogram/secretaris-generaal, `ministeries/ezk-secretaris-generaal.html`. Yields SG Sandor Gaastra.
- Officiele bekendmakingen, Staatscourant 2026, 8174 tot en met 8194 en 8740, https://www.officielebekendmakingen.nl/stcrt-2026-8174 en volgende, onder `obk/`. Yields de benoemings- en herindelings-KB's van het kabinet-Jetten, inclusief de twee vice-minister-presidenten (8178), de naamswijziging van EZ (8176), de herindelingen (8177, 8180), de vervangingsregeling (8194) en de benoeming van de waarnemend directeur van het Kabinet van de Koning (8740).
- Het Koninklijk Huis, Koning Willem-Alexander, leden, rol van het staatshoofd, organisatie, Dienst van het Koninklijk Huis, Kabinet van de Koning en onderscheidingen, https://www.koninklijkhuis.nl, onder `koninklijkhuis/`. Yields de troonsaanvaarding op 30 april 2013, de rol van het staatshoofd en de taakomschrijving van de hofdiensten.

Retrieved 2026-09-18 (fetched this run because no cached copy existed):

- Rijksoverheid, secretaris-generaal van AZ, BZ, Defensie, Financien, LVVN, OCW, SZW en VWS, onder `ministeries/az-sg.html`, `bz-sg.html`, `def-ambtelijke-leiding.html`, `fin-ambtelijke-leiding.html`, `lvvn-ambtelijke-leiding.html`, `ocw-ambtelijke-leiding.html`, `szw-sg.html`, `vws-sg.html`. Yields de huidige naam van de ambtelijke leiding per ministerie.
- Het Koninklijk Huis, Kanselarij der Nederlandse Orden, https://www.koninklijkhuis.nl/onderwerpen/koninklijk-huis/onderscheidingen/kanselarij-der-nederlandse-orden, `ministeries/kh-kanselarij.html`. Yields taken, geschiedenis en omvang van de Kanselarij.

## Decisions

Every divergence from the Phase 0 seed, with the alternative that was not taken.

1. **Kabinetssamenstelling 18 plus 10, niet 16 plus 12.** De kop van `00-phase0-snapshot.md` noemt 16 ministers en 12 staatssecretarissen. De officiele regeringspagina en de KB's (8174, 8178, 8181 tot en met 8193) tonen 18 ministers en 10 staatssecretarissen, samen 28. De 28 seed-ids zijn gehandhaafd; de samenstelling is gecorrigeerd naar 18 plus 10.
2. **Jetten heeft een gecombineerde titel.** De seed gebruikte voor `pos:minister-president` de titel "Minister-president". Nu staat er "Minister-president en Minister van Algemene Zaken", conform KB 8174 en zijn pagina. Het id en de slug zijn ongewijzigd. De alternatieven, een tweede losse positie of de seed-titel laten staan, zijn niet genomen.
3. **Viceminister-presidenten toegevoegd.** De seed modelleerde deze rollen niet. Toegevoegd is een positie `pos:vice-minister-president` met `seatsCount: 2` en twee tenures (Yesilgoz-Zegerius en Van den Brink), conform KB 8178 artikel 4. Er zijn geen aparte posities "eerste" en "tweede" viceminister-president gemaakt, omdat het KB ze niet nummert; het label "2e viceminister-president" op de pagina van Van den Brink is een paginalabel, geen wettelijke titel.
4. **Staatssecretarissen krijgen Grondwet art. 46.** De seed zette voor alle bewindspersonen art. 43. Voor staatssecretarissen is dat art. 46, de grondslag die de benoemings-KB's zelf noemen. Ministers houden art. 43.
5. **Interne structuur als posities, niet als directoraten.** Het organisatieschema kent geen subtype `directoraat-generaal`, `directie` of `hofdienst`. Daarom zijn de SG's en DG's als posities aan het ministerie gehangen en zijn er geen aparte directoraten als organisaties aangemaakt. De drie hofdiensten gebruiken subtype `uitvoeringsorganisatie`; de Ministerraad gebruikt `commission` met subtype `commissie`. De alternatieven, een verkeerd subtype gebruiken of het schema hier wijzigen, zijn niet genomen; het voorstel staat bij de open vragen.
6. **Nieuwe organisaties ten opzichte van de seed.** `org:ministerraad`, `org:dienst-van-het-koninklijk-huis`, `org:kabinet-van-de-koning` en `org:kanselarij-der-nederlandse-orden` bestonden niet in de seed. `org:regering` blijft ongewijzigd in id en subtype.
7. **De Koning als persoon en positie.** `person:willem-alexander` en `pos:koning` zijn nieuw; de tenure begint op 30 april 2013, de datum waarop hij zijn moeder opvolgde. De overige leden van het Koninklijk Huis zijn niet gemodelleerd, omdat zij geen openbare overheidsfunctie bekleden. Het alternatief, de hele hofhouding opnemen, is niet genomen.
8. **Oprichtingsdatum alleen bij een volledige datum.** Alleen AZ heeft een gedocumenteerde volledige datum (1937-07-03) in `established`. Voor BZ en Financien is het jaar 1798, en voor OCW 2003 en VWS vanaf 1800, in de beschrijving gezet, niet in `established`, om geen dag te verzinnen. De seed had overal `established: null`.
9. **Aliassen toegevoegd aan de ministeries.** De seed had lege aliassen. Nu staan de gangbare afkortingen en namen erin (AZ, BZK, BZ, Defensie, EZK, Financien, IenW, JenV, LVVN, OCW, SZW, VWS). Workstream J blijft eigenaar van de volledige gazetteer.
10. **Portfolio-varianten van Aerdts en Heerma.** De pagina van Aerdts noemt "Digitale Economie en Soevereiniteit", haar loopbaanregel noemt "Digitale Zaken en Soevereiniteit" en KB 8191 benoemt haar als staatssecretaris van Economische Zaken en Klimaat. De seed-titel en slug zijn gehandhaafd en alle drie de bronnen zijn geciteerd. De pagina van Heerma schrijft "Koninkrijkrelaties"; de dataset houdt "Koninkrijksrelaties", zoals de merge-log al vastlegde.
11. **Aanvullende bronnen per entiteit.** Waar de seed alleen de pagina of alleen de Grondwet citeerde, citeert deze workstream nu ook het benoemings-KB, de herindelings-KB's en de ambtelijke-leidingpagina. De seed-bron-ids zijn hergebruikt (31 van de 98); er zijn 67 nieuwe bronrecords toegevoegd, waarvan 9 met retrieved 2026-09-18.
12. **Relatietypes gelijk aan de seed.** Staatssecretarissen krijgen `office` van positie naar ministerie, ministers en SG's `dept_head`. De nieuwe SG/DG-posities gebruiken `office`, behalve de SG's, die `dept_head` krijgen.

## Gaps

Mirrors the `gaps` array in the JSON.

1. De secretaris-generaal van Infrastructuur en Waterstaat is niet gevonden. De pagina op het verwachte pad gaf HTTP 404 en het organogram noemt alleen de functie. Endpoint: https://www.rijksoverheid.nl/ministeries/ministerie-van-infrastructuur-en-waterstaat/organisatie-ienw/organogram. Herstart: zoek de pagina ambtelijke leiding of secretaris-generaal onder `/organisatie-ienw`, of de benoeming in de Staatscourant.
2. De secretaris-generaal van Justitie en Veiligheid is niet gevonden. De pagina over het SG-cluster beschrijft het cluster maar noemt geen naam. Endpoint: https://www.rijksoverheid.nl/ministeries/ministerie-van-justitie-en-veiligheid/organisatie/organogram/sg-cluster. Herstart: zoek een aparte pagina of de benoeming in de Staatscourant.
3. Zeven ministeries missen een gedocumenteerde oprichtingsdatum. De geschiedenispagina's van BZK, Defensie, EZK, IenW, JenV, LVVN en SZW gaven HTTP 404. Endpoint: https://www.rijksoverheid.nl/ministeries/<slug>/organisatie/geschiedenis. Herstart: zoek de huidige geschiedenispagina of de Staatsalmanak en noteer alleen een volledige ISO-datum.
4. De aanvangsdata van de lopende tenures van de meeste SG's en DG's zijn niet gepubliceerd op de geraadpleegde pagina's. Alleen Buitenlandse Zaken (12 augustus 2024) en Defensie (21 augustus 2023) vermelden een datum. Endpoint: https://www.officielebekendmakingen.nl/. Herstart: zoek het benoemings-KB per functionaris.
5. De gestructureerde Staatsalmanak is niet gevonden. Endpoint: https://www.officielebekendmakingen.nl/. Herstart: lokaliseer de jaarlijkse Staatsalmanak en noteer formaat en dekkingsgraad.
6. De huidige Kanselier der Nederlandse Orden is niet genoemd. Endpoint: https://www.koninklijkhuis.nl/onderwerpen/koninklijk-huis/onderscheidingen/kanselarij-der-nederlandse-orden. Herstart: zoek de benoeming in de Staatscourant of op de site van de Kanselarij.
7. De wettelijke grondslag van het Kabinet van de Koning mist een URL. KB 8740 verwijst naar artikel 2 van het Besluit van 18 december 2003, houdende bepalingen over het Kabinet van de Koning, maar het BWB-nummer is niet gefetcht. Endpoint: https://wetten.overheid.nl/. Herstart: zoek dat besluit en noteer het BWB-nummer.

## Open questions

1. **Schemavoorstel subtype `directoraat-generaal` (en `hofdienst`).** Nodig om directoraten-generaal en hofdiensten als organisatie te kunnen opnemen in plaats van als losse posities. Voorstel voor de orchestrator per `docs/04-data-model.md` sectie 18. Wie: orchestrator.
2. **Formele nummering van de viceminister-presidenten.** Bestaat er een wettelijke eerste en tweede viceminister-president, of is de volgorde alleen praktisch? Wie: workstream I, met de Staatsalmanak of een KB.
3. **Het kabinet als entiteit.** Moet het kabinet-Jetten een eigen organisatie of scope krijgen naast de regering, of blijft het een tijdsgebonden set posities? Wie: orchestrator.
4. **De Koning in het tenuremodel.** Is een tenure met start 2013-04-30 de juiste weergave van een erfelijke functie, of hoort het koningschap als `van-rechtswege`-positie zonder gewone tenure te worden gemodelleerd? Wie: orchestrator en workstream I.
5. **Precieze wettelijke grondslag per ministerie.** Deze workstream citeert Grondwet art. 44 als grondslag voor alle ministeries. Workstream H hoort de artikel- en instellingsgrondslag per departement te bevestigen. Wie: workstream H.
